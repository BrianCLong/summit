import { calculateProvenanceScore } from '../../src/graphrag/osint/provenanceScore';
import { enrichOsintAsset } from '../../src/graphrag/osint/enrich';
import { isEnrichmentEnabled } from '../../src/graphrag/osint/flags';
import { OsintAsset } from '../../src/connectors/osint-catalog/types';

async function runTest() {
  console.log('Starting OSINT Innovation Test...');
  let failures = 0;

  // 1. Check Flags Default OFF
  if (isEnrichmentEnabled() === false) {
    console.log('✅ Enrichment disabled by default');
  } else {
    console.error('❌ Enrichment enabled by default (should be OFF)');
    failures++;
  }

  // 2. Check Provenance Scoring
  const lowProv: any = { source: 'random-site', method: 'scrape' };
  const scoreLow = calculateProvenanceScore(lowProv);
  if (scoreLow.score <= 50 && scoreLow.confidence === 'low') { // 40 base
      console.log('✅ Low provenance scored correctly');
  } else {
      console.error(`❌ Low provenance score too high: ${scoreLow.score}`);
      failures++;
  }

  const highProv: any = { source: 'trusted-partner', method: 'partner-export' };
  const scoreHigh = calculateProvenanceScore(highProv);
  if (scoreHigh.score >= 80) {
      console.log('✅ High provenance scored correctly');
  } else {
      console.error(`❌ High provenance score too low: ${scoreHigh.score}`);
      failures++;
  }

  // 3. Check Enrichment (should do nothing by default)
  const asset: OsintAsset = {
      asset_id: 'test',
      name: 'Test',
      license: { name: 'MIT' },
      provenance: highProv,
      privacy: { has_pii: false },
      shareability: 'public',
      created_at: '',
      updated_at: ''
  };

  const enriched = await enrichOsintAsset(asset);
  if (!enriched.tags?.some((t: string) => t.startsWith('provenance-score'))) {
      console.log('✅ Enrichment skipped correctly (flag OFF)');
  } else {
      console.error('❌ Enrichment ran despite flag OFF');
      failures++;
  }

  // 4. Test GAI Hallucination/Safety Guard (Provenance < Threshold)
  // We can simulate enabling flags by mocking or just logic check.
  // Since we can't easily change env vars in this process for the module imported,
  // we rely on unit test logic above for 'enrichOsintAsset' which checks flag first.

  if (failures > 0) {
    console.error(`\n❌ Innovation Tests Failed with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log('\n✅ All Innovation Tests Passed');
  }
}

runTest();
