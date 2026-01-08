# GTM Claims & Control Matrix

| GTM Claim                        | Control / Policy                         | Proof (Test/File)                               |
| -------------------------------- | ---------------------------------------- | ----------------------------------------------- |
| "Enterprise-grade Rate Limiting" | Multi-tiered rate limiting (IP & Tenant) | `server/src/middleware/rateLimit.ts`            |
| "Tenant Quota Isolation"         | Hierarchical Quota Manager               | `server/src/lib/resources/quota-manager.ts`     |
| "Advanced PsyOps Defense"        | Defensive PsyOps Service                 | `server/src/services/DefensivePsyOpsService.ts` |
| "GDPR/CCPA Compliance"           | PII Detection & Hooks                    | `server/src/pii/ingestionHooks.ts`              |
| "Secure Authentication"          | JWT & Auth Service                       | `server/src/services/AuthService.ts`            |
| "Audit Logs"                     | Provenance Ledger                        | `server/src/provenance/ledger.ts`               |
