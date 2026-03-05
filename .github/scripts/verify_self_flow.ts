import fs from "fs"

export function verifyEvidence(){
 if(!fs.existsSync("evidence/self_flow/report.json")){
  throw new Error("missing evidence")
 }
}

verifyEvidence();
