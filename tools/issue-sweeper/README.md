# Issue Sweeper

This tool is designed to automate the process of verifying, fixing, and closing GitHub issues at scale for the `BrianCLong/summit` repository. It operates in batches, maintains a durable state, and generates reports to ensure a safe, incremental, auditable, and scalable workflow.

## Table of Contents

- [Installation](#installation)
- [Authentication](#authentication)
- [Usage](#usage)
- [Resuming and Resetting](#resuming-and-resetting)
- [File Formats](#file-formats)
- [Troubleshooting](#troubleshooting)

## Installation

To set up the Issue Sweeper, navigate to the `tools/issue-sweeper` directory and install the dependencies:

```bash
pnpm -C tools/issue-sweeper install
# or if using npm
# npm install
```

## Authentication

The tool requires a GitHub Personal Access Token (PAT) with appropriate permissions (repo scope for issues, PRs, and comments).

Authentication is supported via:

1.  **`GITHUB_TOKEN` environment variable (preferred)**:
    ```bash
    export GITHUB_TOKEN="YOUR_GITHUB_PAT"
    pnpm -C tools/issue-sweeper start
    ```
2.  **Fallback to `gh auth token`**: If `GITHUB_TOKEN` is not set, the tool will attempt to retrieve a token using the GitHub CLI (`gh auth token`). Ensure `gh` is installed and authenticated.

**Never print tokens or write them to disk.**

## Usage

The Issue Sweeper is run via its CLI entrypoint.

```bash
pnpm -C tools/issue-sweeper start [options]
```

### Options

-   `--repo <owner/repo>`: The target GitHub repository (default: `BrianCLong/summit`).
-   `--batch-size <N>`: Number of issues to process in each batch (default: `50`).
-   `--state <all|open|closed>`: Filter issues by state (default: `all`).
-   `--since <ISO date>`: Only process issues updated after this date.
-   `--max-issues <N>`: Maximum number of issues to process (useful for smoke runs).
-   `--dry-run`: (Default: `true` for write actions to GitHub) If true, no comments, PRs, or closes will be made on GitHub.
-   `--write-comments`: Enable posting "already solved" comments on GitHub issues.
-   `--open-prs`: Enable creating branches and opening PRs for fixes.
-   `--resume`: (Default: `true`) Resume from the last checkpoint in `STATE.json`.
-   `--reset`: Clear `STATE.json` before starting a new run.
-   `--reset-ledger`: (Dangerous) Clear `LEDGER.ndjson` and `STATE.json`. Requires `--i-understand`.
-   `--i-understand`: Confirmation flag for dangerous operations like `--reset-ledger`.

### Examples

```bash
# Start a dry-run for the first batch of 50 issues
pnpm -C tools/issue-sweeper start

# Run and write comments for already solved issues
pnpm -C tools/issue-sweeper start --write-comments

# Process a maximum of 10 issues, resetting the state
pnpm -C tools/issue-sweeper start --max-issues 10 --reset

# Reset ledger and state (requires confirmation)
pnpm -C tools/issue-sweeper start --reset-ledger --i-understand
```

## Resuming and Resetting

The tool maintains its progress in `STATE.json`.

-   By default (`--resume` is true), it will attempt to resume from where it left off.
-   Use `--reset` to clear the `STATE.json` and start a new run without affecting the `LEDGER.ndjson`.
-   Use `--reset-ledger --i-understand` to clear both `STATE.json` and `LEDGER.ndjson`, effectively starting from a clean slate.

## File Formats

The tool generates and maintains the following files in `tools/issue-sweeper/`:

-   `STATE.json`: Stores the current state of the sweeper, including cursor, last processed issue number, and run metadata.
-   `LEDGER.ndjson`: A newline-delimited JSON file, with one entry per processed issue, detailing its status, classification, evidence, and actions taken.
-   `REPORT.md`: A human-readable summary of each batch's processing, including counts and systemic patterns.

## Troubleshooting

-   **Rate Limits**: The tool implements exponential backoff for GitHub API rate limits. If you encounter persistent rate limit errors, consider reducing `--batch-size` or waiting before retrying.
-   **Missing Token**: Ensure your `GITHUB_TOKEN` environment variable is set correctly or that `gh` CLI is installed and authenticated.
-   **Permissions**: Verify your GitHub PAT has the necessary `repo` scope permissions.