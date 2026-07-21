# ADR 0001: Start with a modular monolith and explicit adapter boundaries

Status: accepted — 2026-07-21

## Context

EngTrace needs transactional trace updates, explainable change impact and a credible local demo.
Splitting ingestion, retrieval and governance into network services before their boundaries are
stable would add operational work without improving the portfolio scenario.

## Decision

FastAPI is one deployable with domain modules for traceability, intelligence, change control and
governance. CPU/GPU-heavy ingestion can run as a separate worker using the same packages. Storage,
retrieval and model access sit behind adapters so the zero-infrastructure demo can use deterministic
memory/lexical implementations while production selects PostgreSQL/pgvector, Redis, S3 and vLLM.

## Consequences

- The entire decision path can be tested in-process.
- PostgreSQL remains the system of record; Redis is coordination/cache, never authority.
- LangGraph is limited to workflows with branching, verification or human pauses.
- Service extraction remains possible if independent scaling or ownership becomes real.
