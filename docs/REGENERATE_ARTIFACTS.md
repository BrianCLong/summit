# Regenerating Build Artifacts

Large or binary assets (images, archives, media) are intentionally excluded from pull requests. Generated files should be
recreated locally or during CI runs instead of being committed to Git. This keeps the history lean and allows our scoped CI
lanes to remain deterministic.

## What is blocked?

The `scripts/pr_sanitize.sh` helper and the `pr-sanitize-guard` workflow both block:

- Binary extensions such as `.png`, `.jpg`, `.gif`, `.webp`, `.ico`, `.mp4`, `.mov`, `.pdf`, `.zip`, `.tar`, `.tgz`, `.gz`,
  `.bmp`, `.psd`, `.ai`, `.heic`, `.dmg`, `.exe`, and `.dll`.
- Any single file larger than 5 MB.

If you attempt to add one of these files, the sanitize script or the CI guard will fail with guidance to remove it.

## How do I keep my PR clean?

1. Run `bash scripts/pr_sanitize.sh` before committing. This removes stray build directories and checks for blocked assets.
2. If you just want to verify without deleting artifacts, use `bash scripts/pr_sanitize.sh --check`.
3. Convert binary assets to code or configuration. For example:
   - Store screenshots as generated Playwright artifacts and document the regeneration command.
   - Ship JSON/YAML data fixtures instead of exporting spreadsheets.
   - Rebuild bundles (`npm run build`) on demand instead of committing compiled output.

## My change needs a large asset

If a workflow legitimately requires a large binary (for example, a reference model), publish it to object storage and fetch it
as part of the build/test pipeline. Document the download step in the relevant README or makefile and ensure the CI lane pulls
it dynamically.

## Troubleshooting

- **The sanitize script keeps removing my folder.** Add a regeneration command to the README and ensure the folder is listed in
  `.gitignore`. If the folder truly belongs in Git, update the sanitize script and guard workflow in the same PR.
- **CI failed on `pr-sanitize-guard`.** Follow the error message in the workflow logs—remove the offending file or split it into
  smaller source assets that can be rebuilt.

By keeping pull requests artifact-free, we guarantee deterministic reviews and faster scoped CI cycles.
