const path = require('path');
const { linkCheck } = require('../src/linkcheck');

describe('DocForge link checker', () => {
  const fixturesRoot = path.join(__dirname, '__fixtures__');

  it('returns zero broken links for a valid site', async () => {
    const siteRoot = path.join(fixturesRoot, 'valid_site');
    const result = await linkCheck({ rootDir: siteRoot });
    expect(result.broken).toHaveLength(0);
  });

  it('detects internal broken links', async () => {
    const siteRoot = path.join(fixturesRoot, 'broken_site');
    const result = await linkCheck({ rootDir: siteRoot });
    expect(result.broken).toEqual([
      {
        source: 'index.html',
        target: 'missing/page.html',
      },
    ]);
  });
});
