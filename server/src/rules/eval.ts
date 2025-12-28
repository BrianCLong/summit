export type Cond = { op:'AND'|'OR'|'NOT', children?:Cond[] } | { op:'PRED', predId:string, args?:any };

export function evalCond(c:Cond, env:(predId:string,args:any)=>boolean): boolean {
  if (c.op==='PRED') return env(c.predId, c['args']);
  if (c.op==='NOT') return !evalCond(c.children![0], env);
  const kids = c.children!.map(k => evalCond(k, env));
  return c.op==='AND' ? kids.every(Boolean) : kids.some(Boolean);
}
