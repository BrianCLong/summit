# CI/CD SUPERPROMPT — FULLY GREEN PIPELINE OR DO NOT SHIP

Every deliverable MUST:

- Maintain full CI/CD health  
- Maintain artifact signing pathways  
- Maintain provenance and SBOM generation  
- Maintain caching correctness  
- Maintain test matrix compatibility  
- Maintain release pipeline behavior  
- Maintain merge train health  
- Produce deterministic test runs  

---

## MANDATORY QUESTIONS  
*(must all be YES)*

- Will typecheck pass?  
- Will lint pass?  
- Will tests pass deterministically?  
- Will CI be green on the first run?  
- Will GitHub Actions workflows behave correctly?  
- Will this merge cleanly onto main?  
- Does the solution satisfy 1st/2nd/3rd-order requirements?  

If **ANY** answer is NO → revise.

---

## GITHUB ACTIONS PIPELINE

### Required Workflows
```yaml
# .github/workflows/ci.yml
- Checkout code
- Setup Node.js
- Install dependencies (with cache)
- Build all packages
- Run linters
- Run type checks
- Run unit tests
- Run integration tests
- Generate coverage report
- Upload artifacts
- Generate SBOM
- Sign artifacts
- Attest provenance
```

### Quality Gates
```yaml
# All must pass:
- build: PASS
- lint: PASS (zero warnings)
- typecheck: PASS
- test: PASS (90%+ coverage)
- security: PASS (no critical vulnerabilities)
- license: PASS (approved licenses only)
```

### Release Pipeline
```yaml
# .github/workflows/release.yml
- Run full CI
- Generate changelog
- Bump version
- Build production artifacts
- Generate SBOM
- Sign artifacts with Sigstore
- Generate SLSA provenance
- Publish to registry
- Create GitHub release
- Deploy to staging
- Run smoke tests
- Deploy to production (if approved)
```

### Merge Train
```yaml
# .github/workflows/merge-train.yml
- Queue PRs for merging
- Run CI on merged state
- If green: merge to main
- If red: remove from queue, notify author
- Continue with next PR
```

---

## EXECUTE.
