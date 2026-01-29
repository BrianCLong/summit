# Summit OSINT Moat Thesis

## 1. Defensibility: Why Summit Outputs Survive Scrutiny
In legal and regulatory environments, the value of intelligence is binary: it is either admissible or it is noise. Summit achieves admissibility through **Stateful Provenance**. Unlike traditional scraping which captures only the *what* (content), Summit captures the *how* (session state, friction, timing).
*   **The Chain of Custody:** Every data point carries an immutable cryptographic link to its source artifact and the exact conditions of its capture.
*   **The "Clean Hands" Doctrine:** By logging failure events (403s, CAPTCHAs) as first-class data, Summit proves that it respects access boundaries, distinguishing it from indiscriminate scrapers.

## 2. Signal-to-Noise: The Provenance Advantage
The era of "more data is better" is over. In a world of synthetic content and AI hallucinations, **Small, Provenanced Data** beats Large, Unverified Scrapes.
*   **Validation > Volume:** A graph of 1,000 verified, time-stamped assertions is more predictive than a lake of 1,000,000 unverified raw records.
*   **Contradiction First:** Summit's pipeline is designed to surface contradictions immediately. A dataset that hides its internal conflicts is a liability; Summit exposes them as intelligence signals.

## 3. Explainability as a System Property
Explainability in Summit is not a post-hoc feature or a "why did AI do this" tooltip. It is a **hard gate** in the architecture.
*   **The Explainability Gate:** No analytic product can leave the system unless its lineage is fully resolved. If the path from Confidence Score → Claim → Evidence is broken, the build fails.
*   **Audit-Ready by Design:** Auditors do not need to inspect the algorithm; they need to inspect the lineage. Summit's architecture makes this trivial by enforcing "No Opaque Aggregation."
