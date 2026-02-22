import { collectTestMetrics } from './collectors/tests';
import { collectPRMetrics } from './collectors/pr';
import { ProductivityMetrics } from './artifact_writer';

export function collectAllMetrics(): ProductivityMetrics['metrics'] {
  const testReportPath = process.env.TEST_REPORT_PATH || 'junit.xml';
  const testMetrics = collectTestMetrics(testReportPath);
  const prMetrics = collectPRMetrics();

  // Calculate duration from a provided start time, or use 0 if not set
  const startTime = process.env.JOB_START_TIME ? parseInt(process.env.JOB_START_TIME, 10) : Date.now();
  const duration = (Date.now() - startTime) / 1000;

  return {
    duration_seconds: duration,
    tests_passed: testMetrics.passed,
    tests_failed: testMetrics.failed,
    lint_issues: 0, // TODO: Implement lint collector
    review_friction_index: prMetrics.review_friction_index,
    // Add other metrics as needed
  };
}
