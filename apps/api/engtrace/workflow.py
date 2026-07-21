from __future__ import annotations

from time import perf_counter
from typing import NotRequired, TypedDict

from langgraph.graph import END, START, StateGraph

from .domain import AskResponse, Citation
from .repository import InMemoryRepository
from .retrieval import HybridRetriever, to_citation
from .security import detect_prompt_injection


class AnswerState(TypedDict):
    question: str
    top_k: int
    guard_reason: NotRequired[str | None]
    citations: NotRequired[list[Citation]]
    answer: NotRequired[str]
    workflow: list[str]


def _guard(state: AnswerState) -> dict:
    reason = detect_prompt_injection(state["question"])
    return {"guard_reason": reason, "workflow": [*state["workflow"], "guard_input"]}


def _route_after_guard(state: AnswerState) -> str:
    return "blocked" if state.get("guard_reason") else "retrieve"


def _blocked(state: AnswerState) -> dict:
    return {
        "answer": "I can’t follow instructions that attempt to override controls or expose protected configuration. Ask a question about approved engineering artifacts instead.",
        "citations": [],
        "workflow": [*state["workflow"], "block_request"],
    }


def _retrieve_factory(repository: InMemoryRepository):
    retriever = HybridRetriever(repository)

    def _retrieve(state: AnswerState) -> dict:
        hits = retriever.search(state["question"], state["top_k"])
        return {
            "citations": [to_citation(item, score) for item, score in hits],
            "workflow": [*state["workflow"], "retrieve_controlled_context"],
        }

    return _retrieve


def _synthesize(state: AnswerState) -> dict:
    citations = state.get("citations", [])
    if not citations:
        answer = "The approved corpus does not contain enough evidence to answer this question."
    else:
        strongest = citations
        facts = " ".join(f"{item.quote} [{item.id}]" for item in strongest)
        answer = f"Based on the controlled engineering baseline: {facts}"
    return {"answer": answer, "workflow": [*state["workflow"], "grounded_synthesis"]}


def _verify(state: AnswerState) -> dict:
    citation_ids = {item.id for item in state.get("citations", [])}
    answer = state.get("answer", "")
    if citation_ids and not any(f"[{item}]" in answer for item in citation_ids):
        answer = "The evidence could not be cited reliably; the answer was withheld."
    return {"answer": answer, "workflow": [*state["workflow"], "citation_verify"]}


def build_graph(repository: InMemoryRepository):
    graph = StateGraph(AnswerState)
    graph.add_node("guard", _guard)
    graph.add_node("blocked", _blocked)
    graph.add_node("retrieve", _retrieve_factory(repository))
    graph.add_node("synthesize", _synthesize)
    graph.add_node("verify", _verify)
    graph.add_edge(START, "guard")
    graph.add_conditional_edges(
        "guard", _route_after_guard, {"blocked": "blocked", "retrieve": "retrieve"}
    )
    graph.add_edge("blocked", END)
    graph.add_edge("retrieve", "synthesize")
    graph.add_edge("synthesize", "verify")
    graph.add_edge("verify", END)
    return graph.compile()


def answer_question(repository: InMemoryRepository, question: str, top_k: int = 4) -> AskResponse:
    started = perf_counter()
    result = build_graph(repository).invoke({"question": question, "top_k": top_k, "workflow": []})
    latency_ms = round((perf_counter() - started) * 1_000, 2)
    citations = result.get("citations", [])
    blocked = bool(result.get("guard_reason"))
    confidence = 0.0 if blocked or not citations else min(0.98, 0.58 + 0.1 * len(citations))
    return AskResponse(
        answer=result["answer"],
        citations=citations,
        blocked=blocked,
        guard_reason=result.get("guard_reason"),
        confidence=confidence,
        latency_ms=latency_ms,
        workflow=result["workflow"],
    )
