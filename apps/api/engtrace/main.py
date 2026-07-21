from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import UTC, datetime
from time import perf_counter

import uvicorn
from fastapi import FastAPI, Header, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from .config import Settings, get_settings
from .domain import (
    Approval,
    ApprovalDecision,
    ApprovalStatus,
    Artifact,
    ArtifactType,
    AskRequest,
    AskResponse,
    ChangeImpact,
    EvaluationRun,
    IngestRequest,
    IngestResult,
    TraceLink,
)
from .evaluation import run_evaluation
from .impact import analyze_change
from .repository import InMemoryRepository, repository
from .security import can
from .telemetry import configure_telemetry
from .workflow import answer_question

REQUESTS = Counter("engtrace_http_requests_total", "HTTP requests", ["method", "path", "status"])
LATENCY = Histogram("engtrace_http_request_duration_seconds", "HTTP latency", ["path"])
ASKS = Counter("engtrace_answers_total", "Grounded answer requests", ["blocked"])
APPROVAL_DECISIONS = Counter(
    "engtrace_approval_decisions_total", "Approval decisions", ["decision"]
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


def create_app(repo: InMemoryRepository = repository, settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="Industrial requirements intelligence API",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def observe(request: Request, call_next):
        started = perf_counter()
        response = await call_next(request)
        route_path = (
            request.scope.get("route").path if request.scope.get("route") else request.url.path
        )
        REQUESTS.labels(request.method, route_path, response.status_code).inc()
        LATENCY.labels(route_path).observe(perf_counter() - started)
        response.headers["x-content-type-options"] = "nosniff"
        response.headers["x-frame-options"] = "DENY"
        response.headers["referrer-policy"] = "no-referrer"
        return response

    @app.get("/health", tags=["operations"])
    def health() -> dict:
        return {"status": "ok", "service": "engtrace-api", "version": "0.1.0"}

    @app.get("/ready", tags=["operations"])
    def ready() -> dict:
        return {"status": "ready", "artifacts": len(repo.list_artifacts())}

    @app.get("/metrics", include_in_schema=False)
    def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    @app.get(f"{settings.api_prefix}/dashboard", tags=["intelligence"])
    def dashboard() -> dict:
        artifacts = repo.list_artifacts()
        requirements = [item for item in artifacts if item.type == ArtifactType.REQUIREMENT]
        verified = {
            link.source for link in repo.list_links() if link.relation.value == "verified_by"
        }
        return {
            "counts": {
                "requirements": len(requirements),
                "tests": sum(item.type == ArtifactType.TEST for item in artifacts),
                "risks": sum(item.type == ArtifactType.RISK for item in artifacts),
                "evidence": sum(item.type == ArtifactType.EVIDENCE for item in artifacts),
                "pending_approvals": len(repo.list_approvals(ApprovalStatus.PENDING)),
            },
            "trace_coverage": round(
                len(verified & {item.id for item in requirements}) / len(requirements), 3
            ),
            "critical_unverified": [
                item.id
                for item in requirements
                if item.id not in verified and item.criticality.value == "critical"
            ],
            "baseline": "EV Battery Safety / 2026.07",
        }

    @app.get(
        f"{settings.api_prefix}/artifacts", response_model=list[Artifact], tags=["traceability"]
    )
    def artifacts(artifact_type: ArtifactType | None = Query(default=None, alias="type")):
        return repo.list_artifacts(artifact_type)

    @app.post(
        f"{settings.api_prefix}/ingest",
        response_model=IngestResult,
        status_code=status.HTTP_202_ACCEPTED,
        tags=["ingestion"],
    )
    def ingest(
        payload: IngestRequest,
        role: str = Header(default="viewer", alias="x-engtrace-role"),
    ):
        if not can(role, "propose"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Engineer role required",
            )
        accepted, replaced = repo.ingest_artifacts(payload.artifacts)
        return IngestResult(
            document_name=payload.document_name,
            accepted=accepted,
            replaced=replaced,
            review_required=bool(replaced),
        )

    @app.get(
        f"{settings.api_prefix}/artifacts/{{artifact_id}}",
        response_model=Artifact,
        tags=["traceability"],
    )
    def artifact(artifact_id: str):
        item = repo.get_artifact(artifact_id)
        if not item:
            raise HTTPException(status_code=404, detail="Artifact not found")
        return item

    @app.get(f"{settings.api_prefix}/trace", response_model=list[TraceLink], tags=["traceability"])
    def trace():
        return repo.list_links()

    @app.get(
        f"{settings.api_prefix}/requirements/{{requirement_id}}/versions", tags=["change control"]
    )
    def versions(requirement_id: str):
        items = repo.versions_for(requirement_id)
        if not items:
            raise HTTPException(status_code=404, detail="Requirement versions not found")
        return items

    @app.get(
        f"{settings.api_prefix}/changes/{{requirement_id}}",
        response_model=ChangeImpact,
        tags=["change control"],
    )
    def change_impact(requirement_id: str, from_version: int = 1, to_version: int = 2):
        result = analyze_change(repo, requirement_id, from_version, to_version)
        if not result:
            raise HTTPException(status_code=404, detail="Requested version comparison not found")
        return result

    @app.post(f"{settings.api_prefix}/ask", response_model=AskResponse, tags=["intelligence"])
    def ask(payload: AskRequest):
        result = answer_question(repo, payload.question, payload.top_k)
        ASKS.labels(str(result.blocked).lower()).inc()
        return result

    @app.get(f"{settings.api_prefix}/approvals", response_model=list[Approval], tags=["governance"])
    def approvals(status_filter: ApprovalStatus | None = Query(default=None, alias="status")):
        return repo.list_approvals(status_filter)

    @app.post(
        f"{settings.api_prefix}/approvals/{{approval_id}}/decision",
        response_model=Approval,
        tags=["governance"],
    )
    def decide(
        approval_id: str,
        payload: ApprovalDecision,
        role: str = Header(default="viewer", alias="x-engtrace-role"),
        user: str = Header(default="anonymous", alias="x-engtrace-user"),
    ):
        if payload.decision == ApprovalStatus.PENDING:
            raise HTTPException(status_code=422, detail="Decision must be approved or rejected")
        if not can(role, "approve"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Approver role required"
            )
        item = repo.get_approval(approval_id)
        if not item:
            raise HTTPException(status_code=404, detail="Approval not found")
        if item.status != ApprovalStatus.PENDING:
            raise HTTPException(status_code=409, detail="Approval has already been decided")
        if item.requested_by == user:
            raise HTTPException(
                status_code=409,
                detail="Four-eyes control: requester cannot decide their own approval",
            )
        item.status = payload.decision
        item.comment = payload.comment
        item.decided_by = user
        item.decided_at = datetime.now(UTC)
        APPROVAL_DECISIONS.labels(payload.decision.value).inc()
        return item

    @app.post(
        f"{settings.api_prefix}/evaluations/run", response_model=EvaluationRun, tags=["evaluation"]
    )
    def evaluate():
        return run_evaluation(repo)

    configure_telemetry(app, settings.otel_endpoint)
    return app


app = create_app()


def run() -> None:
    uvicorn.run("engtrace.main:app", host="0.0.0.0", port=8000, reload=False)
