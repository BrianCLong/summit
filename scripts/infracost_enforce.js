const fs = require('fs');
const data = JSON.parse(fs.readFileSync('infracost.json', 'utf8'));
const delta = data.projects?.[0]?.breakdown?.totalMonthlyCost?.diff || 0;
const LIMIT = parseFloat(process.env.INFRACOST_LIMIT || '50'); // $50/month
if (delta > LIMIT) {
  console.error(`❌ Cost delta ${delta} > ${LIMIT}`);
  process.exit(1);
}
console.log(`✅ Cost delta ${delta} <= ${LIMIT}`);
