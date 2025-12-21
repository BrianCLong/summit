# CI utilities

## Affected workspace detector

`scripts/ci/detect-affected-workspaces.js` determines which pnpm workspaces are touched by a pull request. It expands patterns from `pnpm-workspace.yaml`, maps each workspace directory to its package name, and compares the diff (`$GITHUB_BASE_REF...HEAD` or `origin/main...HEAD`) to collect the impacted packages.

Use it in CI:

```bash
node scripts/ci/detect-affected-workspaces.js > affected.json
```

If a core file such as `package.json`, `pnpm-lock.yaml`, or `turbo.json` changes, the script treats every workspace as affected to keep the run deterministic.

When detection cannot run, fall back to the full matrix to keep CI green.
