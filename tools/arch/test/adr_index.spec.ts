test('extracts guard rules', () => {
  const s = '<!-- guard: input.hasCilium == true -->';
  expect(/guard:/.test(s)).toBe(true);
});
