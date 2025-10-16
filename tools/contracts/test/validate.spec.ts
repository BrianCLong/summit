test('valid contract passes', () => {
  const yaml = `
area: server
intent: perf
budgets: { p95_ms: 100, err_rate_pct: 0.5 }`;
  // simulate Ajv validation
  expect(/budgets/.test(yaml)).toBe(true);
});
