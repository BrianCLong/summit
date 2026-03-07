import * as fs from 'fs';

function runBench() {
  fs.mkdirSync('artifacts/graphrag', { recursive: true });
  fs.writeFileSync('artifacts/graphrag/stamp.json', JSON.stringify({ timestamp: "0" }, null, 2));
}

runBench();
