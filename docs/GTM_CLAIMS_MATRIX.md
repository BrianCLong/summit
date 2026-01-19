# GTM Claims & Control Matrix

| GTM Claim                        | Control / Policy                         | Proof (Test/File)                                       |
| -------------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| "Enterprise-grade Rate Limiting" | Multi-tiered rate limiting (IP & Tenant) | `server/src/middleware/rateLimit.ts`                    |
| "Tenant Quota Isolation"         | Hierarchical Quota Manager               | `server/src/lib/resources/quota-manager.ts`             |
| "Advanced PsyOps Defense"        | Defensive PsyOps Service                 | `server/src/services/DefensivePsyOpsService.ts`         |
| "GDPR/CCPA Compliance"           | PII Detection & Hooks                    | `server/src/pii/ingestionHooks.ts`                      |
| "Secure Authentication"          | JWT & Auth Service                       | `server/src/services/AuthService.ts`                    |
| "Audit Logs"                     | Provenance Ledger                        | `server/src/provenance/ledger.ts`                       |
| "Trustworthy Automation"         | Policy-bound actions + Receipts          | `active-measures-module/src/approval/approvalEngine.ts` |
| "Auditor-Ready Evidence"         | Signed Evidence Bundles                  | `docs/evidence-bundle.manifest.json`                    |
| "ABAC Simulation"                | Preflight Policy Gating                  | `server/src/middleware/abac.ts`                         |
| "Multi-tenant Cost Attribution"  | Metering & Quota Manager                 | `server/src/lib/resources/quota-manager.ts`             |
