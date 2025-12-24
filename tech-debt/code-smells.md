# Code Smells and Static Analysis

## ESLint (--max-warnings=0)
- Run failed because `@eslint/js` is missing in the current environment and registry access is blocked (403), preventing installation. The legacy `.eslintignore` file also triggered a migration warning.

## depcheck
- `depcheck` is not available in the workspace and cannot be installed due to registry 403 errors, so unused dependency analysis could not run.

## Environment notes
- Package registry requests (e.g., `docx`, npm audit) return 403 Forbidden without authentication, blocking dependency queries and installs.
- Local Node version (22.21.0) is outside the configured engine range (>=20.19.0 <21), which may affect tool compatibility.
