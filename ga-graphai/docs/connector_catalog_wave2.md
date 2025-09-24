# Connector Catalog – Wave 2 Readiness

Wave 2 extends the demo catalog for customers who can supply commercial keys or who prioritise deeper threat and compliance coverage. Each manifest ships with owner teams, go-live dependencies, and demo narratives to smooth onboarding.

| ID | Connector | Primary Value | Auth / License | Go-Live Dependencies |
| --- | --- | --- | --- | --- |
| `abuseipdb` | AbuseIPDB confidence scoring | Community abuse telemetry to reinforce containment decisions | BYO API key; commercial terms | Secrets-managed API key vault, redistribution guidelines approved |
| `cisa-kev` | CISA Known Exploited Vulnerabilities | Tie remediation SLAs to KEV deadlines and Shodan exposure | Public feed | Nightly mirror job configured, Shodan join validated |
| `hibp` | Have I Been Pwned | Credential exposure checks with selective disclosure | BYO enterprise API key | Data-handling policy approved, breach alert workflow wired |
| `alienvault-otx` | AlienVault OTX Pulses | Pulse-driven IoC expansion with contributor context | BYO API key; restricted reuse | Secrets manager rotation alerts, pulse-to-case overlays tested |
| `urlscan` | urlscan.io cached scans | Phishing screenshots and DOM artifacts with verdicts | BYO API key; commercial | Evidence storage sized for screenshots, submission safeties enabled |
| `misp` | MISP Feed Importer | Multi-org feed sync with taxonomy preservation | BYO API key; restricted | Tenant isolation verified, taxonomy mapping documented |

## Demo Story Starters

- Pair **AbuseIPDB**, **VirusTotal**, and **urlscan.io** to tell a phishing containment story with multi-source consensus and visual evidence.
- Overlay **CISA KEV** deadlines on Shodan exposure findings to highlight remediation urgency.
- Use **HIBP** lookups to trigger soft-gate recommendations and selective disclosure flows before exporting evidence.
- Show how **MISP** pulses seed OTX enrichment and drive cross-community intelligence sharing while staying compliant with distribution levels.

## Operational Notes

- All wave-two connectors default to read-only/demo-safe modes; publication remains guarded by the soft gate.
- Manifests include `goLiveDependencies` so programme managers can track prerequisites before enabling a connector for a tenant.
- The policy package now exposes `groupConnectorsByWave()` and catalog summaries to help UI surfaces and ops dashboards visualise rollout status.
