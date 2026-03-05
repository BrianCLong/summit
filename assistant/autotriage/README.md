# Autotriage Engine

Automated issue triage, classification, and reporting engine for Summit.

## Features

- **Multi-Source Data Collection**: Backlog, Bug Bash results, GitHub issues.
- **Intelligent Classification**: Area detection, Impact analysis, Type classification, **Initiative tracking**.
- **Issue Clustering**: Groups similar issues using TF-IDF.
- **Reporting**: Markdown and JSON reports.
- **Automation**: Label suggestions, Comment drafts.

## Usage

```bash
# Basic triage
node cli.js triage

# Filter by initiative (e.g., Comet v2)
node cli.js triage --initiative comet_v2_triage

# Include GitHub issues
node cli.js triage --github

# Generate report to file
node cli.js triage --output report.md
```

## Initiatives

The engine can classify items into strategic initiatives. Configure initiatives in `config.ts`:

```typescript
initiatives: [
  {
    id: "comet_v2_triage",
    keywords: ["comet v2", "atomic pr"],
    patterns: [/comet.?v2/i, /atomic.?pr/i],
  },
  // ...
]
```

## Development

```bash
cd assistant/autotriage
npm install
npm run build
npm test
```

See `config.ts` for all rules and thresholds.
