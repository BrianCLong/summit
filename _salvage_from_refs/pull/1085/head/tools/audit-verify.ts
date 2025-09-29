import * as fs from "fs";
import * as crypto from "crypto";

type Entry = { ts:string, runId:string, actor:string, action:string, payload:any, prevHash?:string, hash:string };

const file = process.argv[2] || "audit-export.jsonl";
let prev = "";
for (const line of fs.readFileSync(file, "utf8").split("\n").filter(Boolean)) {
  const e: Entry = JSON.parse(line);
  const h = crypto.createHash("sha256").update(prev + JSON.stringify({ts:e.ts,runId:e.runId,actor:e.actor,action:e.action,payload:e.payload})).digest("hex");
  if (h !== e.hash) throw new Error(`Audit chain broken at runId ${e.runId}`);
  prev = e.hash;
}
console.log("✅ Audit chain verified");
