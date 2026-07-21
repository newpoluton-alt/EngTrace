from __future__ import annotations

import os

import dramatiq
from dramatiq.brokers.redis import RedisBroker

from engtrace.evaluation import run_evaluation
from engtrace.impact import analyze_change
from engtrace.repository import repository

redis_broker = RedisBroker(
    url=os.getenv("ENGTRACE_REDIS_URL", "redis://localhost:6379/0"),
    namespace="engtrace",
)
dramatiq.set_broker(redis_broker)


@dramatiq.actor(queue_name="analysis", max_retries=3, time_limit=300_000)
def evaluate_baseline() -> dict:
    """Run the quality gate outside the request path."""
    return run_evaluation(repository).model_dump(mode="json")


@dramatiq.actor(queue_name="analysis", max_retries=3, time_limit=60_000)
def compute_change_impact(requirement_id: str, from_version: int = 1, to_version: int = 2) -> dict:
    """Calculate explainable graph impact for a controlled revision."""
    result = analyze_change(repository, requirement_id, from_version, to_version)
    if result is None:
        raise ValueError(f"Unknown version comparison for {requirement_id}")
    return result.model_dump(mode="json")
