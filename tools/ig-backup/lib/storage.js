const fs = require('node:fs');
const path = require('node:path');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function readDatabase(dbPath) {
  if (!fs.existsSync(dbPath)) {
    return { cases: [], objects: [], caseRefs: [] };
  }
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  return {
    cases: data.cases ?? [],
    objects: data.objects ?? [],
    caseRefs: data.caseRefs ?? [],
  };
}

function writeDatabase(dbPath, payload) {
  ensureDir(dbPath);
  fs.writeFileSync(dbPath, JSON.stringify(payload, null, 2));
}

module.exports = {
  readDatabase,
  writeDatabase,
};
