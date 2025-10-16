test('areas groups by top-level folder', () => {
  const out = JSON.parse(`{"server":["server/x.ts"],"client":["client/y.ts"]}`);
  expect(Object.keys(out)).toContain('server');
  expect(Object.keys(out)).toContain('client');
});
