from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class ArtifactType(StrEnum):
    REQUIREMENT = "requirement"
    TEST = "test"
    RISK = "risk"
    EVIDENCE = "evidence"


class RelationType(StrEnum):
    VERIFIED_BY = "verified_by"
    MITIGATED_BY = "mitigated_by"
    EVIDENCED_BY = "evidenced_by"
    DEPENDS_ON = "depends_on"


class Criticality(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ApprovalStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Artifact(BaseModel):
    id: str
    type: ArtifactType
    title: str
    content: str
    source: str
    version: int = 1
    criticality: Criticality = Criticality.MEDIUM
    tags: list[str] = Field(default_factory=list)
    owner: str
    status: str = "active"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TraceLink(BaseModel):
    source: str
    target: str
    relation: RelationType
    confidence: float = Field(ge=0, le=1)
    rationale: str
    approved: bool = True


class RequirementVersion(BaseModel):
    requirement_id: str
    version: int
    content: str
    changed_at: datetime
    changed_by: str
    change_note: str


class Approval(BaseModel):
    id: str
    subject_id: str
    subject_type: str
    title: str
    requested_by: str
    required_role: str = "approver"
    status: ApprovalStatus = ApprovalStatus.PENDING
    risk: Criticality
    rationale: str
    decided_by: str | None = None
    decided_at: datetime | None = None
    comment: str | None = None


class Citation(BaseModel):
    id: str
    label: str
    source: str
    quote: str
    score: float


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2_000)
    top_k: int = Field(default=4, ge=1, le=10)


class IngestRequest(BaseModel):
    document_name: str = Field(min_length=3, max_length=200)
    source: str = Field(min_length=3, max_length=500)
    artifacts: list[Artifact] = Field(min_length=1, max_length=100)


class IngestResult(BaseModel):
    document_name: str
    accepted: list[str]
    replaced: list[str]
    review_required: bool


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation]
    blocked: bool = False
    guard_reason: str | None = None
    confidence: float = Field(ge=0, le=1)
    latency_ms: float
    estimated_cost_usd: float = 0
    workflow: list[str]


class ApprovalDecision(BaseModel):
    decision: ApprovalStatus
    comment: str = Field(min_length=2, max_length=500)


class ImpactNode(BaseModel):
    artifact: Artifact
    depth: int
    path: list[str]
    reason: str


class ChangeImpact(BaseModel):
    requirement_id: str
    from_version: int
    to_version: int
    before: str
    after: str
    changed_terms: list[str]
    risk_level: Criticality
    impacted: list[ImpactNode]
    approval_required: bool


class EvaluationMetric(BaseModel):
    name: str
    value: float
    target: float
    unit: str
    passed: bool
    description: str


class EvaluationRun(BaseModel):
    run_id: str
    created_at: datetime
    dataset: str
    cases: int
    metrics: list[EvaluationMetric]
    attack_results: list[dict[str, Any]]
    overall_passed: bool
