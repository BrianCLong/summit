# Vercel React Best Practices Mapping (InfoQ Feb 2026)

## Enforcement Map

| Practice                            | Summit rule                          | Enforcement point                            |
| ----------------------------------- | ------------------------------------ | -------------------------------------------- |
| Client/server boundary discipline   | `RBP-001`                            | `scripts/react_boundary_analyzer.ts`         |
| Explicit cache strategy             | `RBP-002`                            | `scripts/react_cache_validator.ts`           |
| Streaming boundary for async routes | `RBP-003`                            | `scripts/react_cache_validator.ts`           |
| Deployment/runtime discipline       | CI hard fail + deterministic reports | `scripts/generate_react_practices_report.ts` |

## Non-goals

- No framework migration.
- No hosting-specific behavior changes.
- No runtime production toggles in this slice.
