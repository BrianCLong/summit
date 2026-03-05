const fs = require('fs');

const files = [
  'server/src/runtime/global/__tests__/GlobalTrafficSteering.test.ts',
  'server/src/runtime/global/__tests__/FailoverOrchestrator.test.ts',
  'server/src/data-residency/__tests__/residency-guard.test.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  content = `/* eslint-disable no-undef */\n` + content;
  fs.writeFileSync(file, content);
}
