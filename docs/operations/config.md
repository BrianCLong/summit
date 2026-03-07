# Tenant Configuration Injection

Per-tenant config is injected through environment variables and seed files:

- `SUMMIT_ORG_SEED=1` enables bootstrap of first org.
- companyOS policies are loaded from org-scoped JSON rule files.
- `COMPANYOS_ENFORCE=0` is default for staged rollout.
- Switchboard and Maestro must read `COMPANYOS_URL` and fail closed when enforce=1 and companyOS is unavailable.
