// Logs context for integration suite; tests are filtered by path/filename patterns.
if (!process.env.TEST_INTEGRATION) {
  // eslint-disable-next-line no-console
  console.warn('Integration tests are skipped (TEST_INTEGRATION not set)');
}

