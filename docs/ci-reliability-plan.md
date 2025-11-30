# CI Reliability Plan  
  
## Short‑term (1‑2 weeks)  
- Determine deterministic workspace builds: update CI to use `pnpm install --frozen-lockfile` and ensure `pnpm-lock.yaml` is in sync.  
- Fix build issues in `@intelgraph/prov-ledger-client` and `@intelgraph/synthdata-service` by addressing tsconfig settings like `allowImportingTsExtensions`.  
- Stabilize the golden path workflow by adding controlled startup waits, using pre-built services, and improving resource allocation so the API health check runs reliably.  
  
## Medium‑term (1‑2 months)  
- Modernize tsconfig across all packages to align with workspace standards, including strict module resolution and removal of outdated options like `allowImportingTsExtensions`.  
- Add CI dashboards and logs to better monitor workflow performance and spot bottlenecks.  
- Implement caching policies using `pnpm store` and TypeScript incremental builds.  
- Introduce auto‑validation for "green PR" to automatically run test suites on pull requests.  
  
## Long‑term (3‑6 months)  
- Harden the monorepo by enforcing deterministic builds and continuously improving the workflows.  
- Profile CI runner memory usage and optimize dependencies to reduce resource consumption.  
- Expand the golden path tests to cover additional integration scenarios.  
- Evaluate migrating to self‑hosted runners for heavy workloads to ensure sufficient resources.
