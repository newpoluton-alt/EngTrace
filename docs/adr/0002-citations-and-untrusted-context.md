# ADR 0002: Treat retrieved content as untrusted and make citations executable

Status: accepted — 2026-07-21

## Context

Engineering answers must survive audit. Retrieved documents may also contain malicious
instructions, so a high similarity score is not equivalent to trusted control flow.

## Decision

Input is screened before retrieval, retrieved text is data-only, generation has no tools, and every
returned fact carries an artifact ID. A final node verifies that at least one returned citation is
present in the answer; otherwise EngTrace abstains. Production adapters additionally verify tenant,
document version and source anchors before returning a citation.

## Consequences

- Retrieval and citation correctness can be measured deterministically.
- The demo refuses known instruction-override attacks before any corpus access.
- A model upgrade cannot silently remove provenance without failing an evaluation gate.
