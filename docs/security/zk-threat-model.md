# Zero-Knowledge Threat Model (ZK-TM)

**Version:** 1.0
**Status:** DRAFT
**Scope:** Zero-Knowledge Deconfliction Service

---

## 1. Trust Assumptions

### 1.1 Actors

| Actor              | Role                 | Trust Level     | Capability                                                        |
| ------------------ | -------------------- | --------------- | ----------------------------------------------------------------- |
| **Tenant**         | Data Owner / Querier | **Untrusted**   | Can ingest data, run queries, attempt inference attacks.          |
| **Summit Host**    | Service Provider     | **Semi-Honest** | "Honest-but-curious". Follows protocol but may log side-channels. |
| **Coalition Peer** | External Partner     | **Untrusted**   | Similar to Tenant but connects via network API.                   |
| **Auditor**        | Verifier             | **Trusted**     | Can decrypt audit logs (with quorum) to verify compliance.        |

### 1.2 Security Boundaries

- **Tenancy Boundary:** Data from Tenant A must never be visible to Tenant B in plaintext.
- **Inference Boundary:** Tenant A must not be able to deduce the existence of specific non-overlapping records in Tenant B.
- **Cardinality Boundary:** Exact size of Tenant B's dataset should be masked (bucketed) to prevent granular tracking.

---

## 2. Assets at Risk

| Asset                   | Description                                | Sensitivity  | Risk of Compromise                                    |
| ----------------------- | ------------------------------------------ | ------------ | ----------------------------------------------------- |
| **Raw Identifiers**     | Emails, Phone #s, Crypto wallet addresses. | **CRITICAL** | Direct identification of targets/sources.             |
| **Embeddings**          | Vector representations of entities.        | **HIGH**     | Inversion attacks can reconstruct original text/data. |
| **Intersection Set**    | The actual overlapping items.              | **HIGH**     | Reveals shared operational interest/context.          |
| **Dataset Cardinality** | Total number of items in a set.            | **MEDIUM**   | leaks operational tempo or size of knowledge base.    |

---

## 3. Threat Scenarios

### 3.1 Dictionary / Brute-Force Attacks (The "Rainbow Table" Risk)

- **Attack:** Malicious Tenant A uploads a massive dictionary of all possible emails (e.g., from a breach) as "their" dataset to find overlaps with Tenant B.
- **Mitigation:**
  - **Rate Limiting:** Strict limits on query batch sizes.
  - **Entropy Checks:** Reject low-entropy inputs if detectable.
  - **Cost:** Proof-of-Work or financial cost per query (future scope).
  - **Policy:** "Need-to-know" access controls before allowing overlap checks.

### 3.2 Intersection Size Leakage

- **Attack:** Tenant A queries with 1 item. If overlap is found, they know Tenant B has that specific item.
- **Mitigation:**
  - **Minimum Set Size (k-anonymity):** Queries must contain at least $k$ distinct items.
  - **Noise:** Differential Privacy (DP) noise added to the result count (e.g., "Overlap: Low/Med/High" instead of "1").

### 3.3 Side-Channel Attacks

- **Attack:** Measuring the _time_ taken to compute intersection to infer set size or data distribution.
- **Mitigation:**
  - **Constant-Time Algorithms:** Use constant-time crypto operations where possible.
  - **Padding:** Pad all sets to fixed block sizes before processing.

### 3.4 Malicious Host (Man-in-the-Middle)

- **Attack:** The Summit Host saves the intermediate hashes from both Alice and Bob and runs a brute-force attack offline.
- **Mitigation:**
  - **Ephemeral Keys:** Use ephemeral keys for the ECDH exchange that are discarded immediately.
  - **Salt:** High-entropy, per-session salts.

---

## 4. Unacceptable Failures (Must Block)

1.  **Plaintext Leak:** Any raw identifier appearing in logs, errors, or temporary tables.
2.  **Unilateral Deanonymization:** A single tenant successfully mapping >1% of another tenant's private graph via repeated queries.
3.  **Silent Failure:** The system returning "No Overlap" due to error when overlaps exist (false negative), leading to intelligence failure / fratricide.
