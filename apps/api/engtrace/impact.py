from __future__ import annotations

import re
from collections import deque

from .domain import ChangeImpact, Criticality, ImpactNode
from .repository import InMemoryRepository

IMPORTANT_TERM = re.compile(r"\b\d+(?:\.\d+)?\s*(?:°C|ms|seconds?|minutes?|V|Ω/V|%)?", re.I)


def analyze_change(
    repository: InMemoryRepository, requirement_id: str, from_version: int, to_version: int
) -> ChangeImpact | None:
    versions = {item.version: item for item in repository.versions_for(requirement_id)}
    before = versions.get(from_version)
    after = versions.get(to_version)
    if not before or not after:
        return None

    before_terms = set(IMPORTANT_TERM.findall(before.content))
    after_terms = set(IMPORTANT_TERM.findall(after.content))
    changed_terms = sorted(before_terms.symmetric_difference(after_terms))
    impacted: list[ImpactNode] = []
    seen = {requirement_id}
    queue: deque[tuple[str, int, list[str]]] = deque([(requirement_id, 0, [requirement_id])])
    adjacency: dict[str, list[tuple[str, str]]] = {}
    for link in repository.list_links():
        adjacency.setdefault(link.source, []).append((link.target, link.relation.value))
        adjacency.setdefault(link.target, []).append((link.source, link.relation.value))

    while queue:
        current, depth, path = queue.popleft()
        if depth >= 2:
            continue
        for neighbor, relation in adjacency.get(current, []):
            if neighbor in seen:
                continue
            seen.add(neighbor)
            artifact = repository.get_artifact(neighbor)
            if artifact:
                impacted.append(
                    ImpactNode(
                        artifact=artifact,
                        depth=depth + 1,
                        path=[*path, neighbor],
                        reason=f"Connected through {relation.replace('_', ' ')}",
                    )
                )
                queue.append((neighbor, depth + 1, [*path, neighbor]))

    requirement = repository.get_artifact(requirement_id)
    critical = requirement and requirement.criticality == Criticality.CRITICAL
    return ChangeImpact(
        requirement_id=requirement_id,
        from_version=from_version,
        to_version=to_version,
        before=before.content,
        after=after.content,
        changed_terms=changed_terms,
        risk_level=Criticality.CRITICAL if critical and changed_terms else Criticality.HIGH,
        impacted=impacted,
        approval_required=bool(critical or len(impacted) >= 3),
    )
