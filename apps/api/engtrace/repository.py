from __future__ import annotations

from copy import deepcopy

from .domain import Approval, ApprovalStatus, Artifact, ArtifactType, RequirementVersion, TraceLink
from .seed import APPROVALS, ARTIFACTS, LINKS, VERSIONS


class InMemoryRepository:
    """Deterministic demo repository; production adapters implement the same boundary."""

    def __init__(self) -> None:
        self.artifacts = {item.id: deepcopy(item) for item in ARTIFACTS}
        self.links = deepcopy(LINKS)
        self.versions = deepcopy(VERSIONS)
        self.approvals = {item.id: deepcopy(item) for item in APPROVALS}

    def list_artifacts(self, artifact_type: ArtifactType | None = None) -> list[Artifact]:
        items = list(self.artifacts.values())
        if artifact_type:
            items = [item for item in items if item.type == artifact_type]
        return sorted(items, key=lambda item: item.id)

    def get_artifact(self, artifact_id: str) -> Artifact | None:
        return self.artifacts.get(artifact_id)

    def ingest_artifacts(self, artifacts: list[Artifact]) -> tuple[list[str], list[str]]:
        accepted: list[str] = []
        replaced: list[str] = []
        for artifact in artifacts:
            if artifact.id in self.artifacts:
                replaced.append(artifact.id)
            else:
                accepted.append(artifact.id)
            self.artifacts[artifact.id] = artifact
        return accepted, replaced

    def list_links(self) -> list[TraceLink]:
        return self.links

    def versions_for(self, requirement_id: str) -> list[RequirementVersion]:
        return sorted(
            [item for item in self.versions if item.requirement_id == requirement_id],
            key=lambda item: item.version,
        )

    def list_approvals(self, status: ApprovalStatus | None = None) -> list[Approval]:
        items = list(self.approvals.values())
        if status:
            items = [item for item in items if item.status == status]
        return sorted(items, key=lambda item: item.id)

    def get_approval(self, approval_id: str) -> Approval | None:
        return self.approvals.get(approval_id)


repository = InMemoryRepository()
