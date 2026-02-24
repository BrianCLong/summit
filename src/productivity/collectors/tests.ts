import fs from 'node:fs';

export interface TestMetrics {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

export function collectTestMetrics(reportPath: string): TestMetrics {
  if (!fs.existsSync(reportPath)) {
    // console.warn(`Test report not found at ${reportPath}`);
    return { passed: 0, failed: 0, skipped: 0, duration: 0 };
  }

  const content = fs.readFileSync(reportPath, 'utf-8');

  // Heuristic regex to match standard JUnit/Jest output on the root <testsuites> element
  // Example: <testsuites name="jest tests" tests="15" failures="0" time="1.234">
  // Or <testsuite tests="15" failures="0" ...>

  // We prioritize the root aggregate if available
  const rootMatch = content.match(/<testsuites[^>]*tests="(\d+)"[^>]*>/) ||
                    content.match(/<testsuite[^>]*tests="(\d+)"[^>]*>/);

  if (!rootMatch) {
     return { passed: 0, failed: 0, skipped: 0, duration: 0 };
  }

  const tagContent = rootMatch[0];

  const getAttr = (name: string) => {
    const m = tagContent.match(new RegExp(`${name}="([\\d.]+)"`));
    return m ? parseFloat(m[1]) : 0;
  };

  const total = getAttr('tests');
  const failures = getAttr('failures');
  const errors = getAttr('errors');
  const time = getAttr('time');
  const skipped = getAttr('skipped');

  return {
    passed: total - failures - errors - skipped,
    failed: failures + errors,
    skipped: skipped,
    duration: time
  };
}
