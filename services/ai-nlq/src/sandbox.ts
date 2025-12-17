// services/ai-nlq/src/sandbox.ts
const FORBIDDEN = [/DELETE\s/i, /DETACH\s/i, /CREATE\s/i, /MERGE\s/i, /SET\s/i];

export function safe(cypher:string){
  if(FORBIDDEN.some(r=>r.test(cypher))) return { ok:false, reason:"destructive token" };
  return { ok:true };
}

export function runSandbox(cypher:string){
  return [{ id:"p1", label:"Person" }, { id:"o1", label:"Org" }];
}
