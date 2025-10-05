function createResult({ name, description, passed, details = [], remediation }) {
  return {
    name,
    description,
    passed,
    details,
    remediation
  };
}

function summarize(results) {
  const failures = results.filter((result) => !result.passed);
  return {
    results,
    summary: {
      passed: failures.length === 0,
      failures: failures.map((failure) => ({
        name: failure.name,
        details: failure.details,
        remediation: failure.remediation
      }))
    }
  };
}

module.exports = {
  createResult,
  summarize
};
