# CI Bootstrap Failure Analysis

## Symptoms
CI workflows occasionally fail with a `git exit 128` error during the bootstrap phase, frequently originating in steps that require full repository history or tags (e.g., standard versioning tools, semantic diffs, git descriptive commands).

## Diagnosis Steps
- An audit of the `.github/workflows/` directory indicates roughly 500 instances of `actions/checkout@v4`.
- The majority omit arguments to `actions/checkout`, resulting in a default shallow fetch (depth=1, without tags).
- Several shared `.github/workflows/reusable/*.yml` pipelines define common tasks like building, unit testing, and E2E verification, where they also perform shallow clones. As a result, when CI jobs attempt to use standard git tools, they inevitably fail and return a fatal code 128.

## Root Cause Analysis
Default checkout operations inside GitHub Actions only retrieve a shallow list. When downstream tools such as release tooling or commit history analyzers attempt to run during the build/CI bootstrap phase, the lack of complete history/tags causes git to fail, interrupting the entire CI pipeline. The problem lies specifically in the reusable bootstrap workflows.

## Proposed Fix Matrix
1. **Apply universally:** Use `sed` to replace every instance of `actions/checkout@v4` with `fetch-depth: 0` and `fetch-tags: true`. *Con: Slows down CI across hundreds of jobs that don't need it, unnecessarily increases load.*
2. **Apply explicitly in specific apps:** Define checkout arguments inside each individual application's repository. *Con: Poor maintenance model, doesn't address the shared CI problem.*
3. **Smallest Central Fix (Recommended):** Directly update the core `.github/workflows/reusable/` pipelines that serve as the CI bootstrap mechanism. By adding `fetch-depth: 0` and `fetch-tags: true` to these central actions (`build-test.yml`, `e2e.yml`, `package.yml`, `security.yml`, `smoke.yml`, `unit.yml`, `sbom.yml`, `policy_opa.yml`, etc.), we provide a unified fix for all apps relying on standard CI without needing to edit unrelated application code.

## Implementation Details
We will patch the `actions/checkout@v4` usages inside `.github/workflows/reusable/*.yml` to explicitly include:
```yaml
        with:
          fetch-depth: 0
          fetch-tags: true
```
This guarantees any application integrating standard reusable workflows receives the complete repository state required to run standard toolchains without encountering a `git exit 128` error.
