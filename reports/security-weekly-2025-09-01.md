# Supply Chain Risk Weekly Report — 2025-09-01

| Service          | Owner                          | Critical | High | Medium | Low  |
| ---------------- | ------------------------------ | -------- | ---- | ------ | ---- |
| conductor-api    | sre-team@intelgraph.example    | 0/0      | 0/2  | 1/6    | 0/20 |
| inference-worker | ml-ops@intelgraph.example      | 0/0      | 0/1  | 0/4    | 1/15 |
| reporting-api    | risk-office@intelgraph.example | 0/0      | 0/0  | 0/2    | 0/10 |

## Open Waivers

| Service          | CVE            | Severity | Owner       | Expires    | Status        |
| ---------------- | -------------- | -------- | ----------- | ---------- | ------------- |
| conductor-api    | CVE-2024-9999  | HIGH     | priya.sre   | 2025-09-12 | active        |
| inference-worker | CVE-2024-55555 | MEDIUM   | marco.mlops | 2025-09-02 | expiring <24h |
| reporting-api    | CVE-2023-42442 | LOW      | claire.risk | 2025-10-31 | active        |

## Signed Artifact Coverage

- Total artifacts evaluated: **3**
- Signed artifacts: **3** (100.0%)
- Attestations verified: **3** (100.0%)
- SBOM coverage: **3/3** services with attached SBOMs

## Alerts & Follow-ups

- ⚠️ Waiver CVE-2024-55555 for inference-worker expires on 2025-09-02 (owner marco.mlops).
