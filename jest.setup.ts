import fs from "fs";
let q:string[]=[]; try{ q = JSON.parse(fs.readFileSync("tests/.quarantine.json","utf8")); }catch{}
const orig = globalIt || it;
(global as any).it = Object.assign((name:any, fn:any, t?:any)=>{
  if (q.some(s=>name.includes(s))) return orig.skip(name, fn, t);
  return orig(name, fn, t);
}, orig);