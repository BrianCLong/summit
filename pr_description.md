## Security Fixes
- Upgraded `axios` to `^1.7.9` (High Severity DoS fix).
- Upgraded `@apollo/server` to `^4.16.0` (High Severity DoS fix).
- Added `pnpm.overrides` for `html-minifier` to `npm:html-minifier-terser@^5.1.1` to resolve High Severity ReDoS in `mjml`.

## Verification
- Verified `axios` and `@apollo/server` versions in `package.json` and `pnpm-lock.yaml`.
- Verified `html-minifier` override in `pnpm-lock.yaml`.
- Inventoried legacy `apollo-server` (v3) usage for future migration (in `docs/evidence/ga-hardening/apollo-v3-usage.txt`).

## Known Issues
- Existing test failures in `server` package related to `metrics.js` exports (unrelated to dependency updates).
- Legacy `apollo-server` v3 usage remains and requires a dedicated migration PR.
