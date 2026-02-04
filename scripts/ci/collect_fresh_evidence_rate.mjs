import fs from "fs";

const summaries = process.argv.slice(2);
let num = 0;
let den = summaries.length;

for (const p of summaries) {
  try {
    const s = JSON.parse(fs.readFileSync(p, "utf8"));
    const verified = s.evidence?.verified === true;

    // Check timestamp freshness (24h)
    const buildTime = new Date(s.evidence?.buildTime).getTime();
    const runTime = new Date(s.run?.endTime).getTime();
    const age = runTime - buildTime;
    const isFresh = age >= 0 && age <= 86400000; // 24 * 60 * 60 * 1000

    if (verified && isFresh) num++;
  } catch {}
}

const rate = den === 0 ? 0 : Math.floor((100 * num) / den);

const out = {
  label: "Fresh Evidence Rate (7d)",
  message: `${rate}%`,
  color: rate >= 95 ? "brightgreen" : rate >= 85 ? "yellow" : "red"
};

fs.writeFileSync(
  "docs/governance/metrics/fresh-evidence-rate.json",
  JSON.stringify(out, null, 2)
);
