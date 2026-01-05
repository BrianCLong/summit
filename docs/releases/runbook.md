# Release Runbook (Atomic Guardrail)

This runbook describes the standard operating procedure for cutting releases, enforcing the "GO Evidence" guardrail.

## Prerequisites

*   **Maestro CLI** installed and configured.
*   Access to the `main` branch.

## 1. Pre-Tag Dry-Run

Before pushing a tag (e.g., `v1.2.3`), you must perform a dry-run and generate evidence.

```bash
# 1. Run the dry-run command
# Replace <tag> and <sha> with actual values
npx tsx server/src/scripts/maestro-cli.ts release-dry-run --tag v1.2.3 --sha $(git rev-parse HEAD)

# 2. Verify evidence file is created
cat release-evidence/v1.2.3.json
```

## 2. Commit Evidence

Commit the generated evidence file to `main`. This signals approval ("GO").

```bash
git add release-evidence/v1.2.3.json
git commit -m "chore(release): evidence for v1.2.3"
git push origin main
```

## 3. Push Tag

Once the evidence is on `main`, you can push the tag.

```bash
git tag v1.2.3
git push origin v1.2.3
```

The GitHub Actions workflow will:
1.  Detect the tag push.
2.  Check for `release-evidence/v1.2.3.json` on `main`.
3.  Verify the `sha` matches the tag's SHA.
4.  Proceed with the release if valid.

## Bypass (Emergency Only)

If you must bypass the evidence check (e.g., critical hotfix where dry-run is broken), you cannot use `git push --tags`. You must manually trigger the workflow via GitHub UI or API.

1.  Go to **Actions** > **GA Release**.
2.  Click **Run workflow**.
3.  Select the branch/tag.
4.  Set `bypass_evidence` to `true`.
5.  Provide a `bypass_reason` (Required).

This bypass will be logged in the release evidence artifact.
