#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function getArg(name: string): string {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? (process.argv[idx + 1] || "") : "";
}

async function main() {
  const agent = getArg("--agent");
  const event = getArg("--event");
  const out = path.resolve(".summit-out");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(
    path.join(out, "summary.md"),
    `## Summit Agent Stub\n- Agent: ${agent}\n- Event: ${event}\n`,
    "utf8"
  );
  console.log(JSON.stringify({ agent, event }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
