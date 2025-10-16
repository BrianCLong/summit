const fs = require('fs');
function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}
const prev = readJSON('baseline/lhci.json') || {}; // store from default branch nightly
const cur = readJSON('.lighthouseci/manifest.json') || {}; // from PR run
const out = {
  perfDelta:
    (cur?.summary?.performance || 0) - (prev?.summary?.performance || 0),
};
fs.writeFileSync('pr-scorecard.json', JSON.stringify(out, null, 2));
