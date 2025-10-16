const fs = require('fs');
const u = JSON.parse(fs.readFileSync('docs/ops/finops/usage.json', 'utf8'));
// simplistic: 0.5 kWh/GB data transfer; 400 gCO2e/kWh (region dependent)
const gb = u.bytes / 1e9;
const kwh = gb * 0.5;
const co2 = kwh * 400;
const budget = 50000; // gCO2e/week
const ok = co2 <= budget;
fs.writeFileSync(
  'docs/ops/finops/carbon.json',
  JSON.stringify(
    {
      gb: Number(gb.toFixed(3)),
      kwh: Number(kwh.toFixed(2)),
      gCO2e: Math.round(co2),
      budget,
      ok,
    },
    null,
    2,
  ),
);
if (!ok) {
  console.error('Carbon budget exceeded');
  process.exit(1);
}
