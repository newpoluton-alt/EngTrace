from engtrace.repository import InMemoryRepository
from engtrace.retrieval import HybridRetriever


def test_retrieval_is_deterministic_and_explainable() -> None:
    retriever = HybridRetriever(InMemoryRepository())
    first = retriever.search("firmware rollback signed image", top_k=3)
    second = retriever.search("firmware rollback signed image", top_k=3)
    assert [(item.id, score) for item, score in first] == [
        (item.id, score) for item, score in second
    ]
    assert first[0][0].id == "REQ-CYB-001"
    assert all(score > 0 for _, score in first)
