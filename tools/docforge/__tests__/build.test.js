const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { buildSite } = require('../src/build');

async function read(filePath) {
  return fs.readFile(filePath, 'utf8');
}

describe('DocForge build pipeline', () => {
  const fixtureRoot = path.join(__dirname, '__fixtures__', 'sample_repo');
  const goldenRoot = path.join(__dirname, '__fixtures__', 'golden');

  it('generates deterministic artifacts that match golden snapshots', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docforge-build-'));
    const outDir = path.join(tmpDir, 'site');
    const result = await buildSite({ rootDir: fixtureRoot, outDir });

    expect(result.version).toBe('2.3.4');

    const comparisons = [
      ['index.html', path.join(outDir, 'index.html')],
      ['version-index.html', path.join(outDir, '2.3.4', 'index.html')],
      [
        'module-src__analytics_js.html',
        path.join(outDir, '2.3.4', 'modules', 'src__analytics_js.html'),
      ],
      [
        'module-tools__report_py.html',
        path.join(outDir, '2.3.4', 'modules', 'tools__report_py.html'),
      ],
      [
        'module-pcbo__engine_go.html',
        path.join(outDir, '2.3.4', 'modules', 'pcbo__engine_go.html'),
      ],
      [
        'adr-adr-0001-adopt-docforge.html',
        path.join(outDir, '2.3.4', 'adrs', 'adr-0001-adopt-docforge.html'),
      ],
      ['versions.json', path.join(outDir, 'versions.json')],
      ['search-index.json', path.join(outDir, '2.3.4', 'search-index.json')],
      ['sitemap.xml', path.join(outDir, 'sitemap.xml')],
    ];

    for (const [goldenName, actualPath] of comparisons) {
      const expected = await read(path.join(goldenRoot, goldenName));
      const actual = await read(actualPath);
      expect(actual).toBe(expected);
    }
  });
});
