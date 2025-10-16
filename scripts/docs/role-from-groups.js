module.exports = function (groups = '') {
  const g = (groups || '').split(',').map((s) => s.trim());
  if (g.includes('docs:internal')) return 'internal';
  if (g.includes('docs:partner')) return 'partner';
  return 'public';
};
