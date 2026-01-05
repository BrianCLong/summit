# Backport Helper

This tool helps automate the creation of backport plans by listing merged PRs labeled for a specific release series.

## Usage

```bash
pnpm release:backport-plan -- --series <X.Y> [--repo <owner/name>] [--out <path>] [--since <tag>]
```

### Arguments

*   `--series <X.Y>`: **Required**. The target release series (e.g., `0.3`). This maps to labels like `backport/release-0.3`.
*   `--repo <owner/name>`: The GitHub repository (e.g., `intelgraph/intelgraph-platform`). Defaults to `GITHUB_REPOSITORY` env var or detected from git config.
*   `--out <path>`: Output file path. Defaults to `dist/release/backport-plan.md`. (A JSON sidecar is also created at the same location).
*   `--since <tag>`: Optional. Only include PRs merged after the commit date of the specified tag (e.g., `v0.3.1`).

### Environment Variables

*   `GITHUB_TOKEN` or `GH_TOKEN`: Required for GitHub API access. If not present, the tool attempts to use the `gh` CLI.

## Output

The script generates a Markdown file containing:

1.  A table of PRs to backport, including merge commit SHAs.
2.  A block of `git cherry-pick` commands to apply the backports to the release branch.
3.  A checklist for finalizing the release tag.

## Example

```bash
# Generate a plan for the 0.3 series, including only PRs merged since v0.3.1
pnpm release:backport-plan -- --series 0.3 --since v0.3.1
```
