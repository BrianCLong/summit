# Developer Bootstrap

Run the one-command bootstrap to verify prerequisites, create local env files, and run a quick smoke:

```bash
./dev-tools/bootstrap.sh
```

Use dry-run mode to skip execution-heavy steps:

```bash
DRY_RUN=1 ./dev-tools/bootstrap.sh
```

The script checks for `node`, `pnpm`, and `git`, copies `.env.example` to `.env.local` when present, runs lint checks, and executes `npm run test:quick` to ensure a clean checkout behaves.
