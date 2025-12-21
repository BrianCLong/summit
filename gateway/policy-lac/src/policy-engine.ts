import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

export type Decision = { allowed: boolean; reason: string; matchedRuleId?: string };
export type Context = { action: string; resource: string; attributes: Record<string, any> };

const ajv = new Ajv({ allErrors: true });
const schemaPath = path.join(__dirname, '..', 'policies', 'schema', 'policy.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const validate = ajv.compile(schema);

export function loadPolicy(policyPath: string){
  const raw = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  if(!validate(raw)) throw new Error('Policy schema invalid: ' + ajv.errorsText(validate.errors));
  return raw;
}

function matches(str: string, pattern: string){
  if(pattern.endsWith('*')) return str.startsWith(pattern.slice(0, -1));
  return str === pattern;
}

export function evaluate(policy: any, ctx: Context): Decision {
  let allowHit: any = null; let denyHit: any = null;
  for(const r of policy.rules){
    const actionOk = r.actions.some((a: string) => matches(ctx.action, a));
    const resourceOk = r.resources.some((p: string) => matches(ctx.resource, p));
    if(!(actionOk && resourceOk)) continue;
    const { purpose, labels, sensitivityAtMost, timeWindow } = r.conditions || {};
    if(purpose && (!ctx.attributes.purpose || !purpose.includes(ctx.attributes.purpose))) continue;
    if(labels && (!Array.isArray(ctx.attributes.labels) || !labels.every((l: string)=> ctx.attributes.labels.includes(l)))) continue;
    if(sensitivityAtMost && (ctx.attributes.sensitivity || 'S0') > sensitivityAtMost) continue;
    if(timeWindow){ const now = new Date(); if(now < new Date(timeWindow.start) || now > new Date(timeWindow.end)) continue; }
    if(r.effect === 'deny'){ denyHit = r; break; }
    if(r.effect === 'allow'){ allowHit = r; }
  }
  if(denyHit) return { allowed: false, reason: denyHit.reason || 'Denied by policy', matchedRuleId: denyHit.id };
  if(allowHit) return { allowed: true, reason: allowHit.reason || 'Allowed by policy', matchedRuleId: allowHit.id };
  return { allowed: false, reason: 'Denied by default (no matching rule)' };
}

export type PolicyDiff = {
  added: string[];
  removed: string[];
  changed: { id: string; from: string; to: string }[];
};

export function diffPolicies(left: any, right: any): PolicyDiff {
  const leftRules = new Map<string, any>();
  const rightRules = new Map<string, any>();
  left.rules.forEach((r: any) => leftRules.set(r.id, r));
  right.rules.forEach((r: any) => rightRules.set(r.id, r));
  const added: string[] = []; const removed: string[] = []; const changed: { id: string; from: string; to: string }[] = [];
  for(const id of leftRules.keys()){
    if(!rightRules.has(id)) removed.push(id);
    else if(JSON.stringify(leftRules.get(id)) !== JSON.stringify(rightRules.get(id))){
      changed.push({ id, from: JSON.stringify(leftRules.get(id)), to: JSON.stringify(rightRules.get(id)) });
    }
  }
  for(const id of rightRules.keys()) if(!leftRules.has(id)) added.push(id);
  return { added: added.sort(), removed: removed.sort(), changed: changed.sort((a,b)=>a.id.localeCompare(b.id)) };
}

export function loadDefaultPolicy(){
  const examplesDir = path.join(__dirname, '..', 'policies', 'examples');
  const files = fs.readdirSync(examplesDir).filter((f) => f.endsWith('.json'));
  const merged = { version: 'v1', rules: [] as any[] };
  for (const f of files){
    const p = loadPolicy(path.join(examplesDir, f));
    merged.rules.push(...p.rules);
  }
  return merged;
}
