# Summit/IntelGraph Performance Benchmark Tests

This directory contains comprehensive performance benchmark tests for the Summit/IntelGraph platform, designed to measure the impact of UI/UX improvements across multiple dimensions.

## Test Suite Overview

The performance benchmark test suite measures:

- **Initial Load Time**: Time from page navigation to network idle state
- **Rendering Performance**: Frame rate and smoothness of UI interactions
- **Memory Usage**: Memory consumption and growth patterns
- **Accessibility Compliance**: WCAG 2.1 AA compliance using axe-core
- **Responsiveness**: First Input Delay, Time to Interactive, and Cumulative Layout Shift
- **Bundle Size**: Total size of client-side assets
- **Network Performance**: Number of requests and transfer size

## Test Files

- `ui-ux-performance-benchmark.ts`: Main test suite with all performance measurements
- `before-after-comparison.ts`: Framework for comparing performance before/after improvements
- `run-performance-tests.js`: Script to execute the complete test suite
- `results/`: Directory containing generated reports and metrics

## Performance Budgets

The following performance budgets are enforced:

- Initial Load Time: < 3000ms
- Rendering Performance: > 55 FPS
- Memory Growth: < 50MB during session
- Accessibility: 0 critical violations
- First Input Delay: < 100ms
- Time to Interactive: < 3000ms
- Cumulative Layout Shift: < 0.1
- Bundle Size: < 5MB

## Running the Tests

### Prerequisites

- Node.js and pnpm installed
- Playwright browsers installed: `npx playwright install`
- Application running in development mode

### Execute Tests

```bash
# Run the complete performance test suite
npm run perf:ui-ux

# Or run directly
node perf/comprehensive/run-performance-tests.js
```

### Setting a Baseline

To establish a performance baseline for future comparisons:

```bash
# Run tests and save as baseline
npx tsx perf/comprehensive/before-after-comparison.ts
```

## Reports

After running the tests, the following reports are generated in `perf/comprehensive/results/`:

- `current-metrics.json`: Raw performance metrics from the current run
- `performance-report.md`: Detailed analysis with recommendations
- `comparison-report.md`: Comparison to baseline metrics (if baseline exists)

## Adding New Performance Tests

To add additional performance tests:

1. Add new test cases to `ui-ux-performance-benchmark.ts`
2. Update performance budgets in the same file if needed
3. Update this README with documentation for the new tests

## Integration with CI/CD

These performance tests can be integrated into your CI/CD pipeline to prevent performance regressions:

```yaml
- name: Run Performance Tests
  run: node perf/comprehensive/run-performance-tests.js
```

## Troubleshooting

If tests are failing:

1. Ensure the application is running and accessible
2. Check that Playwright browsers are installed: `npx playwright install`
3. Verify the test URLs match your application endpoints
4. Adjust timeouts if running on slower hardware