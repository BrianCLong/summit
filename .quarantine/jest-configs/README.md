# Quarantined Jest Configurations

These jest configuration files have been quarantined because they are either:

- Not referenced by any package.json script
- Duplicates of the canonical config
- Use incorrect file extensions for ESM packages

## Quarantined Configs

| File                       | Reason                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `jest.coverage.config.js`  | ESM package requires `.cjs` for CJS config. Use `jest.coverage.config.cjs` instead. |
| `jest.oct25.config.cjs`    | Historical config, not referenced anywhere                                          |
| `jest.receipts.config.cjs` | Specialty config, not referenced in package.json                                    |
| `jest.three.config.cjs`    | Specialty config for 3 tests, not referenced                                        |
| `jest.three.config.ts`     | Duplicate of above in TS format                                                     |

## Canonical Configs

The following configs are canonical and should be used:

- `/jest.config.cjs` - Main test config (used by `npm test`)
- `/jest.coverage.config.cjs` - Coverage config (used by `scripts/run-coverage.sh`)
- `/test/fuzz/jest.config.cjs` - Fuzz test config
- `/server/jest.config.ts` - Server-specific config
- `/client/jest.config.cjs` - Client-specific config

## Reference

See `docs/ops/TEST_RUNTIME.md` for canonical test runtime decisions.
