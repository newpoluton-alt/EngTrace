# EngTrace worker

Long-running ingestion, comparison and evaluation jobs use Dramatiq with Redis. The demo API runs
the same pure domain functions synchronously so reviewers need no infrastructure; production sends
these actors to the `analysis` queue.

```bash
dramatiq engtrace_worker.tasks --processes 2 --threads 4
```

Redis coordinates jobs but is not a system of record. Job results are persisted by the production
PostgreSQL adapter before workers acknowledge completion.
