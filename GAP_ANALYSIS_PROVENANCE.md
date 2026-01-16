# Gap Analysis: DB-Level (ProvSQL) vs App-Level (OpenLineage)

## Executive Summary
This document analyzes the trade-offs between implementing **ProvSQL** (Postgres extension for fine-grained provenance) and **OpenLineage** (Application-layer observability) within the Summit Platform.

## 1. Comparison Matrix

| Feature | ProvSQL (DB-Level) | OpenLineage (App-Level) |
| :--- | :--- | :--- |
| **Granularity** | **Row/Cell Level**. Can tell *exactly* which inputs produced a specific `analysis_result` row. | **Job/Dataset Level**. Tells you "Job A read Table X and wrote Table Y". |
| **Blind Spots** | Logic outside the DB (e.g., Node.js computation) is opaque unless explicitly modeled as input tokens. | Internal DB transformations (triggers, stored procs) are opaque unless the integration inspects logs. |
| **Performance** | High overhead for write-heavy tables. Adds hidden columns and joins. | Low overhead. Async event emission (HTTP/Kafka). |
| **Integration** | Requires custom Postgres extension (binary dependency). | Standard libraries (Java, Python, JS). |
| **Use Case** | Forensic Audit, "Why is *this* number wrong?", Probabilistic Data. | Compliance, Pipeline Health, "What downstream dashboards break if I drop table X?". |

## 2. Summit Context: `analysis_results`

For the `analysis_results` table, the provenance requirements are:
1.  **Compliance:** "Who ran this?" (User ID)
2.  **Audit:** "Which algorithm version produced this?"
3.  **Traceability:** "Which specific investigation entities were inputs?"

### ProvSQL Fit
*   **Pros:** If the analysis is performed via SQL queries (e.g., joining `entities` and `transactions`), ProvSQL automatically captures exactly which entity rows contributed to the result.
*   **Cons:** Most Summit analysis happens in **Node.js/Python** code, not SQL. ProvSQL would only see the *insert* coming from the app, losing the upstream read context unless the app explicitly passes "provenance tokens" through the application layer (extremely complex).

### OpenLineage Fit
*   **Pros:** The `AnalysisService` in Node.js knows it read `Entity A` and `Entity B` and produced `Result C`. It can emit a single JSON event capturing this logic.
*   **Cons:** Relies on the developer to truthfully instrument the code.

## 3. Missing Edges & Conflicts

1.  **The Application Gap (Critical):**
    *   ProvSQL sees: `INSERT INTO analysis_results VALUES (...)` (Source: App Connection).
    *   It *misses* that the App Connection previously ran `SELECT * FROM entities`.
    *   **Result:** Disconnected lineage graph. The "Read" and "Write" are separate transactions to the DB.

2.  **Schema Pollution:**
    *   ProvSQL adds hidden columns. Schema migration tools (Prisma, TypeORM) might get confused or try to delete them if not configured to ignore system columns.

## 4. Recommendations

1.  **Use OpenLineage for General Governance:** It is safer, lower overhead, and covers the "App Gap".
2.  **Reserve ProvSQL for "In-DB Compute":** Only enable ProvSQL if we move the Analysis Logic *into* Postgres (e.g., using PL/pgSQL or MadLib) where the read-compute-write cycle is atomic within the DB.
3.  **Pilot Verdict:** For the current Node.js-heavy architecture, ProvSQL introduces high complexity for low value (disconnected graphs). **Recommendation: Pause ProvSQL rollout and prioritize OpenLineage instrumentation in `AnalysisService`.**
