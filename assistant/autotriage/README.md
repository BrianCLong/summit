# Autotriage Engine

Automated triage and classification system for Summit's backlog, bug-bash results, and GitHub issues.

## Overview

The Autotriage Engine automatically:
- **Parses** issues from multiple sources (backlog.json, bug-bash markdown, GitHub API)
- **Classifies** issues by area, impact, and type
- **Clusters** similar issues to identify themes
- **Generates** comprehensive triage reports
- **Suggests** labels and comment drafts for automation

## Quick Start

### Basic Usage

```bash
# Run triage on backlog and bug-bash results
./scripts/autotriage.sh triage

# Save report to file
./scripts/autotriage.sh triage --output triage-report.md

# Include GitHub issues (requires GITHUB_TOKEN)
export GITHUB_TOKEN=your_github_token
./scripts/autotriage.sh triage --github

# Generate everything (report + labels + comments)
./scripts/autotriage.sh triage --all --output report.md
```

### Commands

- `triage` or `backlog` - Run full triage analysis (default)
- `labels` - Generate label suggestions only
- `comments` - Generate comment drafts only
- `help` - Show help message

### Options

- `-g, --github` - Include GitHub issues (requires GITHUB_TOKEN)
- `-j, --json` - Output in JSON format (default: markdown)
- `-o, --output <file>` - Output file path (default: stdout)
- `-l, --labels` - Generate label suggestions file
- `-c, --comments` - Generate comment draft file
- `-a, --all` - Generate all outputs (labels + comments)
- `-q, --quiet` - Quiet mode (minimal output)

## Features

### Multi-Source Data Collection

The engine collects issues from:

1. **Backlog** (`backlog/backlog.json`)
   - Structured epics and stories
   - Priority levels (Must/Should/Could)
   - Dependencies and acceptance criteria

2. **Bug-Bash Results** (`bug-bash-results/20250922/`)
   - P0 (Critical), P1 (Degraded), P2 (Papercuts)
   - Structured markdown templates
   - Component and runbook tracking

3. **GitHub Issues** (optional)
   - Open/closed issues
   - Existing labels and metadata
   - Pull requests (optional)

### Intelligent Classification

#### Area Detection
Automatically detects which areas an issue belongs to:
- **copilot** - AI assistant, LLM, MCP, tools
- **ingestion** - Data import, crawlers, parsers, ETL
- **graph** - Neo4j, relationships, entities, Cypher
- **ui** - Frontend, React, components, UX
- **infra** - Infrastructure, deployment, Docker, CI/CD
- **api** - GraphQL, REST, endpoints, backend
- **observability** - Telemetry, metrics, traces, monitoring
- **security** - Auth, permissions, compliance, audit

#### Impact Analysis
Classifies impact level based on keywords and patterns:
- **blocker** (P0) - Critical issues, crashes, production down
- **high** (P1) - Major issues, degraded performance
- **medium** (P2) - Moderate impact
- **low** (P3/P4) - Minor issues, papercuts

#### Type Classification
Identifies issue type:
- **bug** - Errors, broken functionality
- **tech-debt** - Refactoring, cleanup, legacy code
- **feature** - New functionality
- **enhancement** - Improvements, optimizations

### Issue Clustering

Uses TF-IDF and hierarchical clustering to:
- Group similar issues together
- Identify recurring themes
- Detect duplicate issues
- Surface patterns across the backlog

Configuration:
- `similarityThreshold`: 0.65 (adjust for tighter/looser clustering)
- `minClusterSize`: 2 (minimum issues per cluster)
- `maxClusters`: 20 (maximum clusters to report)

### Good First Issue Detection

Automatically identifies beginner-friendly issues based on:
- Complexity score (calculated from dependencies, acceptance criteria)
- Clear descriptions and steps
- Limited scope
- Existing workarounds

Default threshold: complexity ≤ 30

## Output Formats

### Triage Report (Markdown)

The weekly triage report includes:

#### Summary Statistics
- Total items by source, area, impact, type
- Distribution charts and counts

#### Recommendations
- Actionable insights (blockers, themes, concentrations)
- Sprint planning suggestions
- Good first issues callout

#### Top 10 Blocking Themes
- Clustered issues by theme
- Average impact score
- Related issues with links

#### Top Priority Issues
- Sorted by impact score
- Quick reference table
- Area and type labels

#### Good First Issues
- Beginner-friendly issues
- Complexity scores
- Area tags

### JSON Output

Machine-readable format for integration:
- Full structured data
- All classification metadata
- Cluster information
- Ready for API consumption

### Label Suggestions

`triage-labels.json` contains:
- Issue ID
- Suggested labels (area:X, priority:X, type:X)
- Confidence score

Format:
```json
{
  "issueId": "S-001-01",
  "labels": ["area:observability", "area:security", "priority:blocker", "type:feature"],
  "confidence": 0.75
}
```

### Comment Drafts

`triage-comments.json` contains:
- Auto-triage summaries
- Deduplication notices
- Cluster summaries

Format:
```json
{
  "issueId": "P0-001",
  "comment": "## 🤖 Auto-Triage Results...",
  "relatedIssues": ["P0-002", "P0-003"],
  "action": "cluster-summary"
}
```

## Configuration

Edit `assistant/autotriage/config.ts` to customize:

### Areas
Add or modify area detection:
```typescript
{
  name: 'new-area',
  keywords: ['keyword1', 'keyword2'],
  patterns: [/pattern1/i, /pattern2/i],
  weight: 1.0,
}
```

### Impact Rules
Adjust impact detection:
```typescript
{
  level: 'blocker',
  keywords: ['crash', 'critical', 'p0'],
  patterns: [/\bp0\b/i, /critical/i],
  score: 100,
}
```

### Clustering Parameters
Fine-tune clustering:
```typescript
clustering: {
  similarityThreshold: 0.65,  // 0-1 (higher = stricter)
  minClusterSize: 2,           // minimum issues per cluster
  maxClusters: 20,             // max clusters to report
}
```

## Environment Variables

### GitHub Integration

```bash
# Required for GitHub API access
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxx

# Optional (defaults shown)
export GITHUB_OWNER=BrianCLong
export GITHUB_REPO=summit
```

GitHub API rate limits:
- Without token: 60 requests/hour
- With token: 5000 requests/hour

## Architecture

### Directory Structure

```
assistant/autotriage/
├── config.ts              # Configuration and rules
├── types.ts               # TypeScript type definitions
├── cli.ts                 # Main CLI entry point
├── data/                  # Data parsers
│   ├── backlog-parser.ts
│   ├── bugbash-parser.ts
│   └── github-fetcher.ts
├── classifier/            # Classification modules
│   ├── area-detector.ts
│   ├── impact-analyzer.ts
│   ├── type-classifier.ts
│   └── issue-clusterer.ts
├── reports/               # Report generators
│   └── triage-report.ts
└── automation/            # Automation helpers
    ├── label-generator.ts
    └── comment-drafter.ts
```

### Data Flow

```
┌─────────────┐  ┌──────────────┐  ┌───────────┐
│  Backlog    │  │  Bug-Bash    │  │  GitHub   │
│ (JSON)      │  │  (Markdown)  │  │  (API)    │
└──────┬──────┘  └──────┬───────┘  └─────┬─────┘
       │                │                  │
       └────────────────┴──────────────────┘
                        │
                        ▼
               ┌────────────────┐
               │    Parsers     │
               └────────┬───────┘
                        │
                        ▼
               ┌────────────────┐
               │  Classifiers   │
               │  - Area        │
               │  - Impact      │
               │  - Type        │
               └────────┬───────┘
                        │
                        ▼
               ┌────────────────┐
               │   Clusterer    │
               │  (TF-IDF +     │
               │  Hierarchical) │
               └────────┬───────┘
                        │
                        ▼
               ┌────────────────┐
               │ Report Gen     │
               └────────┬───────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
 ┌──────────┐   ┌──────────┐   ┌──────────┐
 │ Markdown │   │  Labels  │   │ Comments │
 │  Report  │   │   JSON   │   │   JSON   │
 └──────────┘   └──────────┘   └──────────┘
```

## Use Cases

### 1. Weekly Triage Meeting

```bash
# Generate weekly report
./scripts/autotriage.sh triage \
  --github \
  --output weekly-triage.md

# Review top themes and blockers
# Assign owners to high-priority items
# Create epics for recurring themes
```

### 2. Sprint Planning

```bash
# Get full analysis with labels
./scripts/autotriage.sh triage \
  --github \
  --all \
  --output sprint-plan.md

# Review good first issues for onboarding
# Check area distribution for team allocation
# Use clusters to identify sprint themes
```

### 3. GitHub Automation

```bash
# Generate label suggestions
./scripts/autotriage.sh labels --github

# Review triage-labels.json
# Apply labels using GitHub CLI:
gh issue edit <issue-number> --add-label area:graph,priority:high
```

### 4. Deduplication Campaign

```bash
# Generate comment drafts
./scripts/autotriage.sh comments --github

# Review triage-comments.json
# Post deduplication notices
# Link related issues
```

## Development

### Building

```bash
cd assistant/autotriage
npm install
npm run build
```

### Testing

```bash
# Test locally without GitHub
./scripts/autotriage.sh triage

# Test with GitHub (requires token)
./scripts/autotriage.sh triage --github

# Test JSON output
./scripts/autotriage.sh triage --json
```

### Adding New Areas

1. Edit `config.ts` and add to `areas` array
2. Define keywords and patterns
3. Rebuild: `npm run build`
4. Test with sample data

### Customizing Clustering

Adjust in `config.ts`:
```typescript
clustering: {
  similarityThreshold: 0.7,  // Increase for stricter clustering
  minClusterSize: 3,         // Increase to filter small clusters
  maxClusters: 15,           // Decrease for top themes only
}
```

## Troubleshooting

### "No items to triage"
- Check `backlog/backlog.json` exists
- Verify `bug-bash-results/20250922/` has markdown files
- Use `--github` to include GitHub issues

### GitHub API Rate Limit
- Set `GITHUB_TOKEN` environment variable
- Use personal access token with `repo` scope
- Check rate limit: `curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit`

### TypeScript Compilation Errors
```bash
cd assistant/autotriage
npm install
npx tsc --skipLibCheck
```

### Clustering Too Loose/Strict
Adjust `similarityThreshold` in `config.ts`:
- Too loose (many unrelated items): increase threshold (0.7-0.8)
- Too strict (no clusters): decrease threshold (0.5-0.6)

## Roadmap

- [ ] ML-based classification (fine-tuned embeddings)
- [ ] Historical trend analysis
- [ ] Auto-assignment based on ownership patterns
- [ ] Integration with GitHub Actions
- [ ] Slack/Discord notifications
- [ ] Custom report templates
- [ ] Interactive web UI

## License

MIT

## Contributing

See the main Summit repository for contribution guidelines.
