const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const registerTs = () => {
  const compilerOptions = {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
    resolveJsonModule: true,
    skipLibCheck: true
  };

  require.extensions['.ts'] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions,
      fileName: filename
    });
    module._compile(outputText, filename);
  };
};

registerTs();

const { DEFAULT_MSTC_SERVICE, DEFAULT_SUPPORTED_LOCALES, MSTCService } = require('../src/builder');
const { toPpcBlocklist } = require('../src/adapters/ppc');
const { toRegulatoryDigest } = require('../src/adapters/rsr');
const { toCwsTaxonomy } = require('../src/adapters/cws');

const SNAPSHOT_DIR = path.join(__dirname, '__snapshots__');

if (!fs.existsSync(SNAPSHOT_DIR)) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

const readSnapshot = name => {
  const file = path.join(SNAPSHOT_DIR, `${name}.json`);
  if (!fs.existsSync(file)) {
    return undefined;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const writeSnapshot = (name, value) => {
  const file = path.join(SNAPSHOT_DIR, `${name}.json`);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

const assertSnapshot = (name, value) => {
  const snapshot = readSnapshot(name);
  if (snapshot === undefined) {
    writeSnapshot(name, value);
    console.warn(`Created snapshot ${name}`);
    return;
  }
  assert.deepStrictEqual(value, snapshot, `Snapshot mismatch for ${name}`);
};

const service = DEFAULT_MSTC_SERVICE;
const locales = DEFAULT_SUPPORTED_LOCALES;
assert.strictEqual(locales.length, 20);
assertSnapshot('supported-locales', locales);

for (const locale of locales) {
  const canon = service.getCanon(locale);
  assertSnapshot(`canon-${locale}`, canon);
}

const recallMatches = service.match(
  'en-US',
  'The oxy pills were pitched alongside a plan b pill in the same DM.'
);
const recallTags = recallMatches.map(match => match.tag).sort();
assert.deepStrictEqual(recallTags, [
  'health.meds.contraceptives',
  'health.meds.opioids'
]);

const zhMatches = service.match('zh-CN', '警方查获地下赌球和阿片类止痛药销售');
assert.deepStrictEqual(
  zhMatches.map(match => match.tag).sort(),
  ['finance.gambling.sports_betting', 'health.meds.opioids']
);

const rebuilt = MSTCService.bootstrap();
assert.deepStrictEqual(rebuilt.getLocales(), locales);
assert.deepStrictEqual(rebuilt.getCanon('en-US'), service.getCanon('en-US'));

const canonMap = service.getCanonMap();
assertSnapshot('adapter-ppc-en-US', toPpcBlocklist(canonMap, ['en-US']));
const digest = toRegulatoryDigest(canonMap).filter(entry => entry.locale === 'en-US');
assertSnapshot('adapter-rsr-en-US', digest);
assert.strictEqual(digest[0]?.tag, 'finance.credit.loan_shark');

const taxonomy = toCwsTaxonomy(canonMap);
const opioidTag = taxonomy.find(entry => entry.tag === 'health.meds.opioids');
assert(opioidTag, 'CWS taxonomy missing opioid tag');
assert.strictEqual(opioidTag.locales.length, 20);
assertSnapshot('adapter-cws-opioids', opioidTag);

console.log('MSTC snapshot tests completed successfully.');
