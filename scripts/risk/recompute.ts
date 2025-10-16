import { RiskService } from '../../server/src/risk/RiskService';

async function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error('usage: ts-node scripts/risk/recompute.ts <id1> <id2>');
    process.exit(1);
  }
  const service = new RiskService();
  const results = await service.recomputeBatch(ids, '7d');
  for (const r of results) {
    console.log(`${r.modelVersion}:${r.score.toFixed(4)}:${r.band}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
