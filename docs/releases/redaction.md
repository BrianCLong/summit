# Release Bundle Redaction

The release bundle generator supports an optional **redaction mode** to strip or mask sensitive fields from the generated artifacts. This allows safe external sharing (e.g., with vendors or auditors) without leaking internal metadata.

## Redaction Modes

### `none` (Default)
No redaction is applied. The bundle contains full internal details, including repository URLs, run IDs, and usernames.

### `safe-share`
This mode strips specific sensitive fields to produce a "safe" version of the bundle.

**Fields Redacted:**
* **Run Metadata:** `run.url`, `run.id`, `workflow`, `runAttempt`
* **Repository Info:** `repoUrl`, `GITHUB_REPOSITORY`
* **Identity:** Actor/usernames in provenance data
* **Remote URLs:** Links to compare views or internal systems

**Replacement Strategy:**
Sensitive values are replaced with placeholders like `"<redacted>"` or `"<redacted:run-url>"`.

## Usage

To generate a redacted bundle:

```bash
pnpm release:bundle --tag v1.2.3 --redaction safe-share
```

## Verification

The redaction process automatically regenerates the `checksums.txt` file to match the modified artifacts. You can verify the bundle using the standard verification script:

```bash
node scripts/release/verify-release-bundle.mjs --path dist/release
```

## Output

When redaction is applied, a `redaction.json` file is added to the bundle:

```json
{
  "schemaVersion": "1.0.0",
  "mode": "safe-share",
  "appliedAt": "2023-10-27T10:00:00.000Z",
  "filesRedacted": [
    "release-manifest.json",
    "provenance.json"
  ]
}
```
