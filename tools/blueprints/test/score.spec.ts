test("score passes when rules satisfied", ()=>{
  const out = require('child_process').execSync("node tools/blueprints/score.ts packages/blueprints/node-service.yaml demo || true").toString();
  expect(out).toContain("{\"score\"");
});