# Issue Sweeper

Automated issue analysis and tracking system for the Summit repository. Processes thousands of GitHub issues to determine resolution status, track evidence, and generate actionable reports.

## Features

- **Batch Processing**: Fetches and processes issues in configurable batches (default 50)
- **Durable State**: Maintains STATE.json, LEDGER.ndjson, and REPORT.md for full auditability
- **Idempotent**: Safe to re-run without duplicating work
- **Rate-Limit Safe**: Intelligent retry with exponential backoff
- **Resumable**: Continue from where you left off
- **Evidence Tracking**: Automatically finds merged PRs, commits, and related changes
- **Classification**: Categorizes issues (bug, feature, docs, security, etc.)
- **Status Detection**: Determines if issues are already solved, not solved, blocked, duplicate, or invalid

## Installation

From the repository root:

```bash
cd tools/issue-sweeper
pnpm install
```

Or using npm:

```bash
cd tools/issue-sweeper
npm install
```

## Authentication

The tool requires GitHub authentication. Choose one of these methods:

### Option 1: Environment Variable (Recommended)

```bash
export GITHUB_TOKEN="your_github_token_here"
```

### Option 2: GitHub CLI

If you have `gh` CLI installed and authenticated:

```bash
gh auth login
```

The tool will automatically use `gh auth token` if `GITHUB_TOKEN` is not set.

### Creating a GitHub Token

1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `repo` (full control)
4. Copy token and set as environment variable

**Security Note**: Never commit tokens to git. The tool never writes tokens to disk.

## Usage

### Basic Run

Process all issues with default settings (dry-run mode):

```bash
pnpm start
```

### Common Examples

**Process first 20 issues (smoke test):**
```bash
pnpm start -- --max-issues 20
```

**Process only open issues:**
```bash
pnpm start -- --state open
```

**Process issues updated since a date:**
```bash
pnpm start -- --since 2024-01-01T00:00:00Z
```

**Process with larger batches:**
```bash
pnpm start -- --batch-size 100
```

**Resume from previous run:**
```bash
pnpm start -- --resume
```

**Start fresh (ignore previous state):**
```bash
pnpm start -- --no-resume --reset
```

**Reset everything (dangerous):**
```bash
pnpm start -- --reset --reset-ledger --i-understand
```

## CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `--repo <owner/repo>` | `BrianCLong/summit` | Repository to process |
| `--batch-size <n>` | `50` | Issues per batch |
| `--state <filter>` | `all` | Filter: `all`, `open`, or `closed` |
| `--since <date>` | - | ISO date to filter by updatedAt |
| `--max-issues <n>` | - | Maximum issues to process (for testing) |
| `--dry-run` | `true` | No GitHub writes (default) |
| `--write-comments` | `false` | Post "already solved" comments |
| `--open-prs` | `false` | Create fix PRs (not implemented yet) |
| `--resume` | `true` | Continue from last state |
| `--no-resume` | - | Start fresh |
| `--reset` | `false` | Clear STATE.json |
| `--reset-ledger` | `false` | Clear all ledger data (requires --i-understand) |
| `--i-understand` | `false` | Confirmation for dangerous operations |

## Output Files

The tool generates three primary files:

### `STATE.json`

Runtime state for resumability:

```json
{
  "repo": "BrianCLong/summit",
  "state_filter": "all",
  "batch_size": 50,
  "cursor": null,
  "last_processed_issue_number": 1234,
  "run_started_at": "2024-01-15T10:00:00Z",
  "run_updated_at": "2024-01-15T11:30:00Z",
  "run_id": "run-2024-01-15T10-00-00",
  "processed_count": 500,
  "error_count": 3,
  "failures": [],
  "open_prs": []
}
```

### `LEDGER.ndjson`

Newline-delimited JSON with one entry per issue:

```json
{"issue_number":1,"title":"Fix bug","url":"...","state":"closed","labels":["bug"],"classification":"bug","solved_status":"already_solved","evidence":{"prs":[{"number":10,"url":"...","mergedAt":"2024-01-10T12:00:00Z","title":"Fix bug"}],"commits":[],"paths":[],"tests":[]},"notes":"Found 1 merged PR(s)","run_id":"run-123","processed_at":"2024-01-15T10:05:00Z"}
```

### `REPORT.md`

Human-readable markdown report with:
- Batch summaries
- Statistics by status and classification
- Top labels
- Evidence details
- Failures and errors

### `ledger/*.json`

Individual JSON files per issue (for idempotency):
- `ledger/00001.json` - Issue #1
- `ledger/00002.json` - Issue #2
- etc.

## How It Works

### 1. Fetch Issues

Uses GitHub REST API with pagination to fetch issues in batches.

### 2. Classify Each Issue

Examines labels and title to determine:
- `bug` - Bug fixes
- `feature` - New features
- `docs` - Documentation
- `security` - Security issues
- `ci` - CI/CD and build
- `perf` - Performance
- `refactor` - Code refactoring
- `question` - Support questions
- `unknown` - Unclassified

### 3. Detect Solution Status

For each issue, searches for evidence:

**Hard Evidence (marks as "already_solved"):**
- Merged PR referencing `#issue_number`
- Commit on default branch mentioning `#issue_number`

**Soft Evidence (marks as "not_solved" with notes):**
- Open/unmerged PRs
- Issue closed with no evidence

**Special Cases:**
- `duplicate` - Closed with duplicate label
- `invalid` - Closed as wontfix/invalid
- `blocked` - Marked as blocked/waiting

### 4. Store Results

- Saves individual ledger entry to `ledger/####.json`
- Regenerates `LEDGER.ndjson` from all ledger files
- Updates `STATE.json` for resumability
- Appends batch results to `REPORT.md`

### 5. Idempotency

Re-running the tool:
- Skips already-processed issues (checks `ledger/####.json`)
- Can force reprocessing with `--reset`
- Never duplicates ledger entries

## Resume and Reset Behavior

### Resume (Default)

```bash
pnpm start --resume
```

- Loads `STATE.json`
- Continues from `last_processed_issue_number`
- Skips issues already in ledger
- Appends to existing `REPORT.md`

### Reset State Only

```bash
pnpm start --reset
```

- Clears `STATE.json`
- Keeps ledger data
- Re-processes issues but updates existing entries
- Starts from beginning

### Reset Everything (Dangerous)

```bash
pnpm start --reset --reset-ledger --i-understand
```

- Clears `STATE.json`
- Clears all `ledger/*.json` files
- Clears `LEDGER.ndjson`
- Starts completely fresh
- Requires `--i-understand` confirmation

## Rate Limits

The tool handles GitHub API rate limits automatically:

- **Primary Rate Limit**: 5,000 requests/hour (authenticated)
- **Search API Limit**: 30 requests/minute

**Rate Limit Handling:**
- Monitors remaining requests in response headers
- Warns when below 100 remaining
- Automatic retry with exponential backoff on 429/403
- Delays between batches (1 second)

**Tips:**
- Use smaller `--batch-size` for safer runs
- Monitor rate limit in logs
- Use `--max-issues` for testing

## Troubleshooting

### "GitHub token not found"

**Solution**: Set `GITHUB_TOKEN` environment variable or authenticate with `gh auth login`.

### "Rate limit exceeded"

**Solution**: Wait for rate limit reset (shown in error) or reduce batch size.

### "Failed to search PRs/commits"

**Cause**: Search API has stricter limits (30/min).

**Solution**: Tool logs warnings but continues. This is expected and safe.

### Tests failing

**Solution**: Ensure you're in the `tools/issue-sweeper` directory:

```bash
cd tools/issue-sweeper
pnpm test
```

### Permission denied on git log

**Cause**: Tool tries to search git history for commit evidence.

**Solution**: Run from repository root or a valid git repository.

## Testing

Run the test suite:

```bash
cd tools/issue-sweeper
pnpm test
```

Tests verify:
- Issue classification logic
- Ledger idempotency
- NDJSON generation
- Statistics calculation
- Fixture loading

## Architecture

```
src/
├── index.ts       # CLI entrypoint and orchestration
├── github.ts      # GitHub API client (pagination, retry, rate limits)
├── ledger.ts      # Durable storage (STATE.json, LEDGER.ndjson, ledger/*.json)
├── detect.ts      # Already-solved detection and classification
├── report.ts      # REPORT.md generation
└── types.ts       # TypeScript interfaces
```

## Development

### Type Checking

```bash
pnpm typecheck
```

### Build

```bash
pnpm build
```

Outputs to `dist/`.

### Run from Source

```bash
pnpm start -- [options]
```

## Roadmap

Future enhancements:

- [ ] Parallel batch processing
- [ ] GraphQL API support (more efficient)
- [ ] Local code search for file paths
- [ ] Automated PR creation (`--open-prs`)
- [ ] Comment posting (`--write-comments` implementation)
- [ ] Issue auto-closing (with safety checks)
- [ ] Webhook integration
- [ ] Web UI for reports

## Safety Guarantees

1. **Default Dry-Run**: No GitHub writes unless explicitly enabled
2. **Idempotent**: Safe to re-run without side effects
3. **Rate-Limit Safe**: Automatic backoff and retry
4. **Durable State**: Never loses progress
5. **Confirmation Required**: Dangerous operations need `--i-understand`
6. **No Token Storage**: Never writes tokens to disk
7. **Atomic Writes**: Each ledger entry written atomically

## License

Part of the Summit repository. See repository root for license details.

## Contributing

This tool is part of the Summit repository automation. For issues or improvements, please open an issue in the main repository.

---

**Version**: 1.0.0
**Maintainer**: Summit Repository Team
