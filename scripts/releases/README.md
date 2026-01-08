# Release Notes Assembler

This directory contains the `assemble_release_notes.mjs` script, which automates the creation of release notes for the Summit Platform.

## Usage

```bash
node scripts/releases/assemble_release_notes.mjs --channel=<rc|ga> --target=<sha|tag|branch> [--since=<tag|sha>] [--plan=<path>] [--out=<path>]
```

### Arguments

- `--channel`: Release channel, either `rc` (Release Candidate) or `ga` (General Availability).
- `--target`: The target git ref (SHA, tag, or branch) for the release.
- `--since`: (Optional) The starting point for the changelog. Defaults to the previous tag.
- `--plan`: (Optional) Path to the release plan markdown file.
- `--out`: (Optional) Output file path. If not provided, prints to stdout.

### Environment Variables

- `GITHUB_TOKEN`: Required for fetching PR metadata from GitHub API.
- `GITHUB_REPOSITORY`: Repository name (e.g., `BrianCLong/summit`). Defaults to `BrianCLong/summit`.

## Output

The script generates a Markdown file following the standard Release Notes template, including:

- **Metadata:** Date, Target SHA, Range.
- **Highlights:** Extracted from commit messages (feat, breaking changes).
- **Changes by Area:** Grouped by `Server`, `Web/UI`, `Infra`, `CI`, `Security`, etc.
- **Verification:** Status placeholders and links to artifacts/evidence.
- **Stabilization:** Summary of known issues (from issuance worksheet logic).
- **Artifacts:** Checksums and compliance checks if `dist/SHA256SUMS` is present.

## Integration

This script is integrated into the `.github/workflows/ga-release.yml` workflow. It runs during the `release` job to generate the `RELEASE_NOTES.md` attached to the GitHub Release.
