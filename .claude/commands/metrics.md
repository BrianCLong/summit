# Metrics Command

Generate codebase metrics and reports for the Summit platform.

## Quick Metrics Report

```bash
pnpm metrics:report
```

## JSON Output (for automation)

```bash
pnpm metrics:report:json
```

## All Metrics

```bash
pnpm metrics:all
```

## Individual Metric Types

### Maintainability Report
```bash
pnpm metrics:report
```

Includes:
- Cyclomatic complexity scores
- Maintainability index
- Technical debt estimates
- Hotspot identification

### Complexity Analysis
```bash
pnpm metrics:complexity
```

ESLint-based complexity checking for:
- Function complexity
- Cognitive complexity
- Nesting depth
- File length

### Code Duplication
```bash
pnpm metrics:duplication
```

Uses jscpd to detect:
- Copy-paste code
- Similar code blocks
- Refactoring opportunities

Output: `./jscpd-report/`

### Lines of Code
```bash
pnpm metrics:loc
```

Uses cloc to count:
- Source lines
- Comment lines
- Blank lines
- By language

## Interpreting Results

### Cyclomatic Complexity

| Score | Risk Level | Action |
|-------|------------|--------|
| 1-10 | Low | Good |
| 11-20 | Moderate | Consider refactoring |
| 21-50 | High | Refactor recommended |
| 50+ | Very High | Must refactor |

### Maintainability Index

| Score | Rating | Meaning |
|-------|--------|---------|
| 20+ | Good | Easy to maintain |
| 10-20 | Moderate | Needs attention |
| 0-10 | Poor | Difficult to maintain |

### Duplication

| Percentage | Status |
|------------|--------|
| < 5% | Excellent |
| 5-10% | Acceptable |
| 10-20% | Warning |
| > 20% | Critical |

## Custom Analysis

### Specific Directory
```bash
cloc server/src --by-file --csv
```

### TypeScript Specific
```bash
npx ts-metrics-cli analyze ./server/src
```

### Test Coverage
```bash
pnpm test:coverage
```

## Dashboard Access

Grafana metrics dashboards:
- URL: http://localhost:3001
- Prometheus: http://localhost:9090

## API Metrics

```bash
curl http://localhost:4000/metrics
```

Shows:
- Request counts
- Response times
- Error rates
- Active connections

## Trends Over Time

For tracking metrics over time:
1. Run `pnpm metrics:report:json > metrics-$(date +%Y%m%d).json`
2. Compare with previous runs
3. Track improvements/regressions

## Taking Action

Based on metrics, prioritize:
1. **High complexity functions** - Break into smaller functions
2. **Duplicate code** - Extract to shared utilities
3. **Low coverage areas** - Add tests
4. **Large files** - Split into modules
