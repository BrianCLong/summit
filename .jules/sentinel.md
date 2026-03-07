## 2024-03-07 - [Remove Insecure Default JWT Secrets]
**Vulnerability:** Default hardcoded JWT secrets (`active-measures-secret-key` and `your-secret-key-change-in-production`) were present in `active-measures-module/src/middleware/auth.ts` and `services/edge-gateway/src/middleware/auth.ts` as fallbacks for the `JWT_SECRET` environment variable.
**Learning:** Development convenience fallbacks can easily slip into production, enabling catastrophic authentication bypass if the environment variable fails to inject.
**Prevention:** Remove fallback values for critical secrets. Implement early, fail-fast validation at module initialization to crash the application if required secrets are missing or of insufficient length.
