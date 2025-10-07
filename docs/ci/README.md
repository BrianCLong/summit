CI repair window – minimal required checks

- Temporary required checks: “CI (core)” and “Security (light)”
- Heavier jobs (CodeQL deep, E2E, preview deploys, fuzzers, quantum/MC gates, container scans) run guarded or informational until stability is proven, then re-promoted to required in phases.
  Phased restore:

1. CodeQL analyze v3
2. Unit tests on Node 20
3. Preview deploys (behind secrets) and integration/E2E
4. Trivy, gitleaks strict, policy/fuzzers
5. Matrices and custom gates
   Branch protection: see scripts/ci/branch-protection.json for the temporary required contexts.
