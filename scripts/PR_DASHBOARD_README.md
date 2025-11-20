# PR Dashboard Tool

A comprehensive dashboard for analyzing and visualizing pull requests by category over time.

## Overview

This tool analyzes git history to categorize and summarize pull requests by:
- **Type**: feature, bug, docs, dependencies, chore, other
- **Status**: merged (extracted from git log)
- **Time Period**: past 6 months (configurable)

## Quick Start

### Generate Dashboard

```bash
# Generate both console output and JSON report
npx tsx scripts/pr-dashboard.ts

# Generate HTML dashboard (requires JSON report first)
npx tsx scripts/generate-pr-dashboard-html.ts

# Or use the combined convenience script
./scripts/run-pr-dashboard.sh
```

### Output Files

- **`pr-dashboard-report.json`**: Machine-readable JSON data
- **`pr-dashboard.html`**: Interactive HTML dashboard with charts

## Features

### Console Dashboard (`pr-dashboard.ts`)

- 📊 **Overview Statistics**: Total PRs, date range
- 📈 **Category Breakdown**: Visual bar charts in terminal
- 👥 **Top Contributors**: Ranked by PR count
- 📋 **Recent PRs**: Lists recent PRs by category

### HTML Dashboard (`pr-dashboard.html`)

- 🎨 **Interactive Charts**: Bar, pie, and doughnut charts using Chart.js
- 📱 **Responsive Design**: Works on desktop and mobile
- 🔍 **Detailed Listings**: Recent PRs by category with metadata
- 🎯 **Key Metrics**: Quick stats cards for total PRs, features, bugs, and top contributors

## Categorization Rules

PRs are automatically categorized based on commit message patterns:

| Category      | Patterns                                                      |
|---------------|---------------------------------------------------------------|
| **Feature**   | `feat`, `feature`, `add `, `enhance`                         |
| **Bug**       | `fix`, `bug`, `hotfix`, `patch`                              |
| **Docs**      | `docs`, `documentation`, `readme`                            |
| **Dependencies** | `chore(deps)`, `bump`, dependency/package updates          |
| **Chore**     | `chore`, `refactor`, `test`, `ci`                            |
| **Other**     | Everything else                                               |

## Data Structure

### JSON Report Schema

```typescript
{
  "summary": {
    "totalPRs": number,
    "timeRange": {
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD"
    },
    "categoryCounts": {
      "feature": number,
      "bug": number,
      // ... other categories
    }
  },
  "categories": {
    "feature": {
      "count": number,
      "prs": [
        {
          "prNumber": string,
          "title": string,
          "date": string,
          "author": string
        }
      ]
    }
    // ... other categories
  },
  "topContributors": [
    {
      "author": string,
      "count": number
    }
  ],
  "generatedAt": "ISO 8601 timestamp"
}
```

## Customization

### Change Time Period

Edit `pr-dashboard.ts`:

```typescript
// Change "6 months ago" to desired period
const gitLogCommand = `git log --since="3 months ago" ...`;
```

### Adjust PR Limits

Edit the number of PRs shown per category:

```typescript
// In pr-dashboard.ts
const recentPRs = stats.prs
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 10); // Change 10 to desired limit
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Generate PR Dashboard

on:
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday
  workflow_dispatch:

jobs:
  dashboard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history needed

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Generate Dashboard
        run: |
          npx tsx scripts/pr-dashboard.ts
          npx tsx scripts/generate-pr-dashboard-html.ts

      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: pr-dashboard
          path: |
            pr-dashboard-report.json
            pr-dashboard.html
```

## Troubleshooting

### Issue: No PRs Found

**Cause**: Git history may not include PR merge commits

**Solution**: Ensure full git history is available:
```bash
git fetch --unshallow
git pull --all
```

### Issue: Missing Dependencies

**Cause**: TypeScript execution environment not available

**Solution**: Install `tsx`:
```bash
npm install -g tsx
# or
pnpm add -g tsx
```

### Issue: Charts Not Rendering in HTML

**Cause**: Internet connection required for Chart.js CDN

**Solution**: The HTML dashboard uses Chart.js from CDN. Ensure internet connectivity when viewing.

## Examples

### Console Output Example

```
================================================================================
  PR DASHBOARD - Past 6 Months Summary
================================================================================

📊 Overview:
   Total PRs: 254
   Date Range: 2025-10-16 to 2025-11-20

📈 PRs by Category:

  ✨ feature          127 ( 50.0%)  ████████████████████████████████████████
  🐛 bug               71 ( 28.0%)  ██████████████████████░░░░░░░░░░░░░░░░░░
  📚 docs               6 (  2.4%)  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  📦 dependencies      24 (  9.4%)  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  🔧 chore             11 (  4.3%)  ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  📝 other             15 (  5.9%)  █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

## Contributing

### Adding New Categories

Edit `categorizePR()` function in `pr-dashboard.ts`:

```typescript
function categorizePR(title: string): PRData['category'] {
  const lowerTitle = title.toLowerCase();

  // Add your new category check
  if (lowerTitle.includes('your-pattern')) {
    return 'your-category';
  }

  // ... existing checks
}
```

Don't forget to:
1. Update the `CategoryStats` type
2. Add emoji in `categoryEmojis`
3. Add color in `categoryColors` (for HTML dashboard)

## License

Part of the Summit/IntelGraph project. See repository LICENSE for details.

## Support

For issues or questions, please open an issue in the repository or consult the main project documentation.

---

**Last Updated**: 2025-11-20
**Maintainer**: Engineering Team
