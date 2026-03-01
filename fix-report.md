## Root Cause -> Fix Report

**What failed (exact error signature):**
```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

**Root cause (why):**
The global test command `pnpm test` previously used `jest --runInBand` from the monorepo root. This caused Jest to load the entire monorepo's dependency and test graph into a single Node process. Given the size of the repository, this single massive memory footprint exhausted the V8 heap limit.

**Fix summary (what changed):**
I updated the root `test` script in `package.json` to change the concurrency model. Instead of a single root-level Jest invocation, the script now uses pnpm to execute the test script individually across each workspace sequentially:
```json
"test": "pnpm -r --workspace-concurrency=1 test"
```
This delegates Jest's execution to each package, ensuring memory from one package is cleaned up before the next package runs. This reliably prevents heap limits from being breached and improves deterministic CI outcomes during a merge-surge.

Also, I fixed an issue in `packages/intelgraph-disarm` with experimental VM modules by adding the proper `NODE_OPTIONS=--experimental-vm-modules` to its test script.

**Risk assessment (low/med/high) + rollback plan:**
- **Risk:** Low. The change doesn't modify test behavior; it modifies how tests are scheduled. It may increase overall execution time slightly because of multiple Node bootstrap cycles, but drastically improves stability and prevents OOM crashes.
- **Rollback:** `git checkout HEAD package.json` to restore the previous `jest --runInBand` command.
