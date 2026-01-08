#!/usr/bin/env -S npx tsx

const args = process.argv.slice(2);
const queue = args.indexOf("--queue") > -1 ? args[args.indexOf("--queue") + 1] : "unknown";
const target = args.indexOf("--moveTo") > -1 ? args[args.indexOf("--moveTo") + 1] : "failed";

console.log(`[OPS] Draining queue "${queue}" to "${target}"...`);
console.log(`[OPS] (Mock) Moved 0 jobs.`);
