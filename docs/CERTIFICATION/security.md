# Security Evidence Pack

This document records the repeatable security checks required for the **Freeze, Certify, Release** sprint and where to locate their artifacts. Every run must be traceable: include the tool version, command, workflow/job URL, timestamp, and artifact hash.

## Checklist

- [ ] SBOM generated in CycloneDX format.
- [ ] SAST summary produced via CodeQL.
- [ ] Software Composition Analysis (SCA) summary for dependencies.
- [ ] ZAP DAST baseline executed against the bounded target.
- [ ] Evidence artifacts stored under `docs/CERTIFICATION/artifacts/` (or linked CI artifact) with hashes recorded below.

## Artifact Index

| Control | Tool/Version | Command | Timestamp (UTC) | Artifact Path or CI URL | SHA256 |
| ------- | ------------ | ------- | --------------- | ----------------------- | ------ |
| SBOM    |              |         |                 |                         |        |
| SAST    |              |         |                 |                         |        |
| SCA     |              |         |                 |                         |        |
| DAST    |              |         |                 |                         |        |

Populate each row immediately after the run. Prefer relative paths inside `docs/CERTIFICATION/artifacts/` for longevity.

## Recommended Commands

- **SBOM (CycloneDX):** `pnpm exec cyclonedx-bom --output docs/CERTIFICATION/artifacts/sbom/summit.cdx.json`
- **CodeQL SAST:** `gh codeql analyze --format=sarifv2 --output docs/CERTIFICATION/artifacts/sast/codeql.sarif`
- **Dependency SCA:** `pnpm audit --json > docs/CERTIFICATION/artifacts/sca/pnpm-audit.json`
- **ZAP Baseline:** `zap-baseline.py -t https://localhost:PORT -r docs/CERTIFICATION/artifacts/dast/zap-baseline.html`

If CI produces artifacts instead, copy their permanent URLs into the table and record the SHA256 of the downloaded artifact.

## Storage Layout (expected)

```
docs/CERTIFICATION/
├── security.md
└── artifacts/
    ├── sbom/
    ├── sast/
    ├── sca/
    └── dast/
```

Ensure artifact paths are created by the pipeline before writing files. Keep archives under version control only if size permits; otherwise, store them as CI artifacts and record the retrieval link.
