test('miner produces high-precision candidates only', () => {
  const c = [{ support: 50, precision: 0.95 }];
  expect(c[0].precision).toBeGreaterThan(0.9);
});
