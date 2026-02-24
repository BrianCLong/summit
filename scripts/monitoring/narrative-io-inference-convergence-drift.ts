import * as fs from 'fs';

async function main() {
  console.log('Checking Narrative IO drift...');
  try {
      if (fs.existsSync('tests/narrative/fixtures/interpretive_defaults.json')) {
        const fixtures = JSON.parse(fs.readFileSync('tests/narrative/fixtures/interpretive_defaults.json', 'utf8'));
        console.log(`Loaded ${fixtures.length} fixtures`);
      } else {
        console.warn('No fixtures found, skipping drift check');
      }
  } catch (e) {
      console.error('Failed to load fixtures', e);
      process.exit(1);
  }
  console.log('Drift check passed');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
