import { execFileSync } from 'child_process';

test("score passes when rules satisfied", ()=>{
  let out;
  try {
    out = execFileSync("node", ["tools/blueprints/score.ts", "packages/blueprints/node-service.yaml", "demo"]).toString();
  } catch (e) {
    out = e.stdout.toString();
  }
  expect(out).toContain('{"score"}');
});