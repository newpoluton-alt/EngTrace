from __future__ import annotations

import math
import re
from collections import Counter

from .domain import Artifact, Citation
from .repository import InMemoryRepository

TOKEN = re.compile(r"[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)?")
STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "shall",
    "that",
    "the",
    "to",
    "what",
    "when",
    "with",
}


def _normalize(token: str) -> str:
    token = token.lower()
    if token.endswith("ies") and len(token) > 4:
        return f"{token[:-3]}y"
    if token.endswith("s") and len(token) > 4 and not token.endswith("ss"):
        return token[:-1]
    return token


def tokenize(text: str) -> list[str]:
    return [_normalize(token) for token in TOKEN.findall(text) if token.lower() not in STOPWORDS]


class HybridRetriever:
    """Explainable lexical retrieval plus approved trace-graph expansion.

    Production swaps the lexical candidate stage for PostgreSQL FTS + pgvector, while retaining
    this graph expansion and provenance contract.
    """

    def __init__(self, repository: InMemoryRepository):
        self.repository = repository

    def search(self, query: str, top_k: int = 4) -> list[tuple[Artifact, float]]:
        artifacts = [item for item in self.repository.list_artifacts() if item.status == "active"]
        docs = [
            tokenize(f"{item.id} {item.title} {item.content} {' '.join(item.tags)}")
            for item in artifacts
        ]
        query_tokens = tokenize(query)
        if not query_tokens:
            return []
        document_frequency = Counter(token for doc in docs for token in set(doc))
        total = len(docs)
        scored: list[tuple[Artifact, float]] = []
        for artifact, doc in zip(artifacts, docs, strict=True):
            counts = Counter(doc)
            score = 0.0
            for token in query_tokens:
                if token not in counts:
                    continue
                inverse_frequency = math.log(
                    1
                    + (total - document_frequency[token] + 0.5) / (document_frequency[token] + 0.5)
                )
                score += inverse_frequency * (1 + math.log(counts[token]))
            if artifact.id.lower() in query.lower():
                score += 5
            if score > 0:
                scored.append((artifact, round(score, 4)))
        scored.sort(key=lambda item: (-item[1], item[0].id))
        if not scored:
            return []

        primary, primary_score = scored[0]
        expanded = self._expand_approved_trace(primary, primary_score, top_k)
        selected_ids = {item.id for item, _ in expanded}
        for artifact, score in scored[1:]:
            if len(expanded) >= top_k:
                break
            if artifact.id not in selected_ids:
                expanded.append((artifact, score))
                selected_ids.add(artifact.id)
        return expanded

    def _expand_approved_trace(
        self, primary: Artifact, primary_score: float, top_k: int
    ) -> list[tuple[Artifact, float]]:
        selected: list[tuple[Artifact, float]] = [(primary, primary_score)]
        seen = {primary.id}
        links = [link for link in self.repository.list_links() if link.approved]

        def visit(current_id: str, depth: int, forward: bool) -> None:
            if depth > 2 or len(selected) >= top_k:
                return
            candidates = [
                (link.target if forward else link.source, link.confidence)
                for link in links
                if (link.source if forward else link.target) == current_id
            ]
            for neighbor_id, confidence in candidates:
                if neighbor_id in seen or len(selected) >= top_k:
                    continue
                artifact = self.repository.get_artifact(neighbor_id)
                if not artifact or artifact.status != "active":
                    continue
                seen.add(neighbor_id)
                propagated_score = round(primary_score * confidence * (0.82**depth), 4)
                selected.append((artifact, propagated_score))
                visit(neighbor_id, depth + 1, forward)

        # Requirements naturally read forward to their test and evidence chain. Evidence queries
        # read backward to the test and requirement that establish meaning.
        if primary.type.value == "evidence":
            visit(primary.id, 1, forward=False)
            visit(primary.id, 1, forward=True)
        else:
            visit(primary.id, 1, forward=True)
            visit(primary.id, 1, forward=False)
        return selected


def to_citation(artifact: Artifact, score: float) -> Citation:
    excerpt = artifact.content if len(artifact.content) <= 220 else f"{artifact.content[:217]}…"
    return Citation(
        id=artifact.id, label=artifact.title, source=artifact.source, quote=excerpt, score=score
    )
