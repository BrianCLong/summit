#!/usr/bin/env node
import fs from "fs";

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--decision") out.decision = argv[++i];
    else if (a === "--query") out.query = argv[++i];
    else throw new Error(`Unknown arg: ${a}`);
  }
  if (!out.decision) throw new Error("Missing --decision");
  if (!out.query) throw new Error("Missing --query");
  return out;
}

const args = parseArgs(process.argv);
const doc = JSON.parse(fs.readFileSync(args.decision, "utf8"));

let value = doc?.result?.[0]?.expressions?.[0]?.value;

// If the evaluation was for a package/object, extract the specific field if needed
// or just check if "allow" is true within the result.
if (typeof value === 'object' && value !== null) {
  // Try to find the value based on the query suffix
  // e.g. if query is data.summit.deploy.allow and we evaluated data.summit.deploy
  if (args.query.endsWith('.allow') && 'allow' in value) {
    value = value.allow;
  }
}

if (value !== true) {
  process.stderr.write(`OPA gate failed: ${args.query} is not true. Full decision: ${JSON.stringify(doc, null, 2)}\n`);
  process.exit(1);
}
process.stdout.write("OPA gate passed\n");
