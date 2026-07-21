# Stack decisions — verified 2026-07-21

EngTrace pins conservative production baselines, then locks transitive dependencies. “Latest” is
not automatically “compatible”: the notable exceptions are TypeScript 7 (compiler API still moving),
Python 3.14 (outside vLLM's current support window) and the archived MinIO community server.

| Layer | Baseline | Why |
|---|---|---|
| Runtime | Python 3.13, Node 24 LTS | Supported by the full API/GPU and Next.js toolchains. |
| API | FastAPI 0.139, Pydantic 2.13, SQLAlchemy 2.0 | Typed OpenAPI boundary and mature persistence model. |
| Workflows | LangGraph 1.2, Dramatiq 2.2 | Graph only where guard/verify/approval state matters; Redis-backed background work. |
| Retrieval | PostgreSQL 18 + pgvector 0.8.5 | HNSW vectors and PostgreSQL full-text search under the same tenant/RLS boundary. |
| Models | Transformers 5.14, sentence-transformers 5.6, vLLM 0.25.1 | OpenAI-compatible self-hosted inference; vLLM stays in a separate Linux/GPU image. |
| Web | Next.js 16.2, React 19.2, TypeScript 6.0 | Stable App Router baseline; TypeScript 6 remains compatible with typescript-eslint. |
| Telemetry | OTel 1.44 / Collector 0.156, Prometheus 3.13, Grafana 13.1 | Vendor-neutral traces plus measurable HTTP/RAG/governance behavior. |
| Delivery | Docker, Kubernetes 1.34–1.36 APIs, Terraform 1.15 | Local parity, portable runtime, and an AWS production reference. |

## Primary sources

- [FastAPI release notes](https://fastapi.tiangolo.com/release-notes/)
- [Next.js 16.2 release](https://nextjs.org/blog/next-16-2)
- [React 19.2 release](https://react.dev/blog/2025/10/01/react-19-2)
- [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence) and
  [interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [pgvector changelog](https://github.com/pgvector/pgvector/blob/master/CHANGELOG.md),
  [PostgreSQL 18 full-text search](https://www.postgresql.org/docs/18/textsearch-controls.html), and
  [row-level security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html)
- [vLLM GPU installation and compatibility](https://docs.vllm.ai/en/stable/getting_started/installation/gpu/)
- [OpenTelemetry Collector deployment](https://opentelemetry.io/docs/collector/deploy/)
- [Kubernetes version-skew policy](https://kubernetes.io/releases/version-skew-policy/)
- [Terraform CLI](https://developer.hashicorp.com/terraform/cli)

## Object storage decision

The [MinIO community repository was archived on 2026-04-25](https://github.com/minio/minio#readme).
Its final binary release remains pinned in Compose strictly as a local S3 fixture. Production uses
the S3 API through boto3 against a separately assessed maintained service (the reference Terraform
uses AWS S3), with object versioning and optional
[Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html).

## Compatibility notes

- vLLM 0.25.1 supports Linux and Python 3.10–3.13 and pins its own PyTorch/CUDA combination. It is
  never installed in the API image. Its Python package currently constrains FastAPI below 0.137,
  while EngTrace uses 0.139, so a separate OpenAI-compatible service is also the clean dependency
  boundary—not just a scaling choice.
- ESLint 10 and TypeScript 7 are newer, but the Next.js 16.2 lint plugin graph still declares
  ESLint 9 peer ranges and typescript-eslint 8.65 supports TypeScript below 6.1. EngTrace therefore
  pins ESLint 9.39 and TypeScript 6.0 until those compatibility boundaries move.
- Redis is coordination/cache, not authority. PostgreSQL owns trace, approval and audit state.
- Terraform after 1.5 is BUSL-licensed. That does not change this repository's Apache-2.0 license;
  teams requiring OSI-licensed infrastructure tooling should evaluate OpenTofu explicitly.
- Retrieved documents are untrusted data. Authorization filtering happens before retrieval, model
  tools are disabled on answer paths, and citations are verified after synthesis.
