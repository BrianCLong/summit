# Maintainability Badges and Shields

This document describes how to add maintainability metrics badges to your README and documentation.

## Available Badges

### 1. SonarQube Quality Gate

Once SonarQube is configured, you can add quality badges:

```markdown
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)

[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)

[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=sqale_index)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)

[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)

[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)
```

### 2. GitHub Actions Workflow Status

```markdown
[![Maintainability Check](https://github.com/BrianCLong/summit/actions/workflows/maintainability-check.yml/badge.svg)](https://github.com/BrianCLong/summit/actions/workflows/maintainability-check.yml)
```

### 3. Custom Shields.io Badges

Based on your metrics report:

#### Files Over 500 Lines
```markdown
![Large Files](https://img.shields.io/badge/large%20files-397-orange)
```

#### Technical Debt
```markdown
![Technical Debt](https://img.shields.io/badge/TODOs-118-yellow)
```

#### Code Coverage
```markdown
![Coverage](https://img.shields.io/badge/coverage-68%25-yellow)
```

### 4. Dynamic Badge Endpoint

Create a GitHub Action to update badges dynamically:

```yaml
# .github/workflows/update-badges.yml
name: Update Badges

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:

jobs:
  update-badges:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate metrics
        run: pnpm run metrics:report:json

      - name: Create badge endpoint
        run: |
          node scripts/generate-badge-json.cjs

      - name: Upload to Gist
        uses: schneegans/dynamic-badges-action@v1.6.0
        with:
          auth: ${{ secrets.GIST_TOKEN }}
          gistID: YOUR_GIST_ID
          filename: maintainability-metrics.json
```

### 5. Complete Badge Section for README

```markdown
## Code Quality & Maintainability

### Quality Gates
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)

### Code Metrics
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=sqale_index)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)

### Test Coverage
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=coverage)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=bugs)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=intelgraph-platform)

### CI/CD
[![Maintainability Check](https://github.com/BrianCLong/summit/actions/workflows/maintainability-check.yml/badge.svg)](https://github.com/BrianCLong/summit/actions/workflows/maintainability-check.yml)
[![Lint](https://github.com/BrianCLong/summit/actions/workflows/lint.changed.yml/badge.svg)](https://github.com/BrianCLong/summit/actions/workflows/lint.changed.yml)
[![Tests](https://github.com/BrianCLong/summit/actions/workflows/tests.changed.yml/badge.svg)](https://github.com/BrianCLong/summit/actions/workflows/tests.changed.yml)
```

## Custom Badge Generator Script

Create dynamic badges based on metrics:

```javascript
// scripts/generate-badge-json.cjs

const fs = require('fs');

// Read metrics from report
const metrics = JSON.parse(fs.readFileSync('maintainability-report.json', 'utf8'));

// Generate badge data
const badges = {
  schemaVersion: 1,
  label: 'maintainability',
  message: getMaintainabilityScore(metrics),
  color: getMaintainabilityColor(metrics),
};

// Save for dynamic badge
fs.writeFileSync('badges/maintainability.json', JSON.stringify(badges, null, 2));

function getMaintainabilityScore(metrics) {
  // Calculate score based on metrics
  const score = calculateScore(metrics);
  return `${score}/100`;
}

function getMaintainabilityColor(metrics) {
  const score = calculateScore(metrics);
  if (score >= 80) return 'brightgreen';
  if (score >= 60) return 'green';
  if (score >= 40) return 'yellow';
  if (score >= 20) return 'orange';
  return 'red';
}

function calculateScore(metrics) {
  let score = 100;

  // Deduct points for large files
  const largeFileRatio = metrics.fileSize.largeFiles.length / metrics.fileSize.total;
  score -= largeFileRatio * 30;

  // Deduct points for technical debt
  score -= Math.min(metrics.debt.total / 10, 20);

  // Deduct points for duplication
  if (metrics.duplication.available) {
    score -= metrics.duplication.percentage * 5;
  }

  return Math.max(0, Math.round(score));
}
```

## Static Badge Examples

For immediate use without SonarQube:

```markdown
<!-- Based on current baseline metrics -->
![Files](https://img.shields.io/badge/files-2628-blue)
![Large Files](https://img.shields.io/badge/large%20files-397-orange)
![Technical Debt](https://img.shields.io/badge/TODOs-118-yellow)
![Duplication](https://img.shields.io/badge/duplication-0.0%25-brightgreen)
![Maintainability](https://img.shields.io/badge/maintainability-B-yellowgreen)
```

Rendered:

![Files](https://img.shields.io/badge/files-2628-blue)
![Large Files](https://img.shields.io/badge/large%20files-397-orange)
![Technical Debt](https://img.shields.io/badge/TODOs-118-yellow)
![Duplication](https://img.shields.io/badge/duplication-0.0%25-brightgreen)
![Maintainability](https://img.shields.io/badge/maintainability-B-yellowgreen)

## Badge Colors

Follow standard conventions:

- **brightgreen** - Excellent (90-100)
- **green** - Good (70-89)
- **yellowgreen** - Acceptable (50-69)
- **yellow** - Needs Improvement (30-49)
- **orange** - Poor (10-29)
- **red** - Critical (0-9)

## Setup Instructions

### For SonarQube Badges

1. Configure SonarQube/SonarCloud (see MAINTAINABILITY.md)
2. Copy badge markdown from above
3. Replace `intelgraph-platform` with your project key
4. Add to README.md

### For GitHub Actions Badges

1. Badges work automatically once workflows are merged
2. Copy markdown from above
3. Replace repo path if different
4. Add to README.md

### For Dynamic Badges

1. Create GitHub Gist for badge data
2. Generate `GIST_TOKEN` with gist permissions
3. Add token to repository secrets
4. Configure `update-badges.yml` workflow
5. Run workflow to generate badges

## Example README Section

```markdown
# IntelGraph Platform

> Next-generation intelligence analysis platform with AI-augmented graph analytics

## Quality Metrics

[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=intelgraph-platform&metric=alert_status)](https://sonarcloud.io/dashboard?id=intelgraph-platform)
[![Maintainability](https://img.shields.io/badge/maintainability-B-yellowgreen)](./MAINTAINABILITY.md)
[![Technical Debt](https://img.shields.io/badge/TODOs-118-yellow)](./reports/baseline-2025-11-20.md)
[![CI](https://github.com/BrianCLong/summit/actions/workflows/maintainability-check.yml/badge.svg)](https://github.com/BrianCLong/summit/actions/workflows/maintainability-check.yml)

### Current Metrics (Updated Weekly)

- **Total Files:** 2,628
- **Large Files (>500 lines):** 397 (15.1%)
- **Technical Debt Markers:** 118
- **Code Duplication:** 0.0%
- **Lines of Code:** ~156,000

See [Maintainability Report](./reports/baseline-2025-11-20.md) for details.

---
```

## Resources

- [Shields.io](https://shields.io/) - Badge generation service
- [SonarCloud Badges](https://docs.sonarcloud.io/advanced-setup/project-information/) - SonarCloud documentation
- [GitHub Actions Badges](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/adding-a-workflow-status-badge) - GitHub documentation
- [Dynamic Badges Action](https://github.com/schneegans/dynamic-badges-action) - GitHub Action for dynamic badges

---

*Last updated: 2025-11-20*
