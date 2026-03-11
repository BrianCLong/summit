# THINKPOL Directory → Summit Subsumption Plan (ITEM 1.0)

## Objective
Summit will surpass high-value public OSINT workflows first (120-tool working set), then absorb the remaining directory long tail through one deterministic adapter contract and unified evidence graph.

## Ground Truth and Claims
- Reddit-linked THINKPOL directory is presented as searchable/categorized with ~900+ OSINT tools.
- Summit public posture already includes agentic AI, ingest, graph workflows, and API layers.
- Summit repository shape supports additive rollout using `adapters/`, `analysis/`, `backend/`, `__tests__/`, `RUNBOOKS/`, and `docs/security/`.
- The practical plan is to prioritize a 120-tool tranche across identity, infra, exposure, web, breach, CTI, archive, media, graph transforms, automation, social, and document discovery.

## Repository-Shaped Delivery Strategy

### Core architecture to land once
1. Canonical evidence schema (`EvidenceId`, `Observation`, `SourceRef`, `Artifact`, `Relationship`).
2. Deterministic OSINT adapter contract (typed input/output + provenance requirements).
3. Case graph assembly and replayable report artifacts.
4. Policy-manifest driven adapter enablement (default deny for live collection).
5. Drift detection and runbook-backed operations.

### Why this outscales one-off integrations
- Converts most of the ~900 catalog into adapter backlog rather than architecture redesign.
- Preserves deterministic replay and CI verifiability for every new source.
- Keeps security and data-handling controls centralized instead of per-tool custom logic.

## 120-Tool Working Set (First-Wave Coverage)

### A. Identity / people resolution (12)
Sherlock, Maigret, GHunt-class, email/username pivots.

### B. Domain / org recon (12)
Amass, theHarvester-class subdomain, WHOIS, cert, ASN pivots.

### C. Exposure search (12)
Shodan, Censys-class internet-facing asset discovery.

### D. Web / URL analysis (12)
urlscan-class redirects/resources/stack fingerprinting.

### E. Breach exposure (10)
HIBP-class breach and password risk enrichment.

### F. CTI sharing (10)
OpenCTI/MISP/STIX-TAXII class IOC correlation and export.

### G. Historical / archive search (10)
Wayback/Intelligence X class timeline and drift analysis.

### H. Media metadata / geo (12)
ExifTool-class metadata extraction and reproducible attribution.

### I. Graph transforms & link analysis (10)
Maltego-class transform workflows with deterministic evidence IDs.

### J. Automation frameworks (10)
SpiderFoot/recon-ng class orchestration via typed adapters.

### K. Social/community intelligence (10)
Reddit/community chronology and behavior delta analysis.

### L. Document/public-web discovery (10)
Dork/filetype/public-doc corpus ingestion with citation-first extraction.

## Seven-PR Stack (Hard-stop)
1. `feat(osint): canonical evidence schema + adapter contract`
2. `feat(osint): identity & people-resolution pipeline`
3. `feat(osint): infrastructure + exposure adapters`
4. `feat(osint): webscan + breach + archive enrichment`
5. `feat(osint): graph assembly + STIX 2.1 export`
6. `feat(osint): policy manifests + data-handling controls`
7. `feat(osint): drift monitor + runbooks + benchmark smoke`

PR dependency order: PR1 first; PR2/PR3 parallel after PR1; PR4 parallelizable after PR1; PR5 after PR2–PR4; PR6/PR7 last.

## Minimal Winning Slice (MWS)
Input seeds: `email | username | domain | URL`.

Output artifacts per run:
- `artifacts/osint/<item-slug>/report.json`
- `artifacts/osint/<item-slug>/metrics.json`
- `artifacts/osint/<item-slug>/stamp.json`
- `artifacts/osint/<item-slug>/graph.ndjson`
- `artifacts/osint/<item-slug>/evidence.jsonl`

Determinism rule: fixtures must avoid unstable timestamps in deterministic snapshots.

## Security & Policy Gates
- Default deny for live adapters unless explicitly enabled.
- Adapter allowlist and policy manifest checks in CI.
- Redaction/never-log controls for keys, auth headers, sensitive breach payloads.
- Evidence citation enforcement: all non-Summit-original claims require `EvidenceId`.

## Performance Budgets (MWS)
- Identity fixture run p95: < 8s
- Domain fixture run p95: < 12s
- Graph assembly p95: < 3s per 1k observations
- Fixture integration memory: < 512MB
- No duplicate provider calls for same normalized target within a case run

## Convergence Protocol
- Shared WBS: schema → adapter contract → identity/infra/web tranches → graph/export → policy/docs/monitoring.
- Conflict rule: master plan governs; propose additive diffs, avoid repo redesign.
- Monitoring cadence:
  - Nightly fixture replay
  - Weekly provider contract snapshot
  - Monthly benchmark trend report

## Positioning Constraints
- Claim workflow unification and deterministic evidence handling now.
- Defer hard replacement claims until measured parity exists.
- Do not claim proprietary data parity; claim workflow subsumption with clean-room adapters.
