test('parseGraph 1000x', () => {
  const t0 = Date.now();
  for (let i = 0; i < 1000; i++) parseGraph(sample);
  const dt = Date.now() - t0;
  expect(dt).toBeLessThan(200); // budget
});
