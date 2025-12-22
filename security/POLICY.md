# Dependency & Security Policy

## License Compliance
We allow the following licenses for dependencies:
- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC
- 0BSD

**Forbidden**:
- GPL (any version) - unless strictly isolated in a tool/script not distributed with the core binary.
- AGPL
- WTFPL

## Dependency Denylist
The following packages are explicitly forbidden:
- `left-pad`: Use native string methods.
- `request`: Deprecated, use `axios` or `fetch`.
- `uuid` < 9.0.0: Vulnerability in older versions.

## Vulnerability Management
- Critical/High vulnerabilities block release.
- Medium/Low should be addressed within 30 days.
