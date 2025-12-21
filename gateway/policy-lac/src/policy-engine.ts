import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

export type Decision = { allowed: boolean; reason: string; matchedRuleId?: string };
export type Context = { action: string; resource: string; attributes: Record<string, any> };

const ajv = new Ajv({ allErrors: true });
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'policies', 'schema', 'policy.schema.json'), 'utf8'));
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

function sensitivityRank(value?: string){
  if(!value) return 0;
  const match = /^S(\d+)/i.exec(value);
  if(!match) return Number.MAX_SAFE_INTEGER;
  return Number.parseInt(match[1], 10);
}

export function evaluate(policy: any, ctx: Context): Decision {
  let allowHit: any = null; let denyHit: any = null;
  for(const r of policy.rules){
    const actionOk = r.actions.some((a: string) => matches(ctx.action, a));
    const resourceOk = r.resources.some((p: string) => matches(ctx.resource, p));
    if(!(actionOk && resourceOk)) continue;
    // conditions
    const { purpose, labels, sensitivityAtMost, timeWindow } = r.conditions || {};
    if(purpose && (!ctx.attributes.purpose || !purpose.includes(ctx.attributes.purpose))) continue;
    if(labels && (!Array.isArray(ctx.attributes.labels) || !labels.every((l: string)=> ctx.attributes.labels.includes(l)))) continue;
    if(sensitivityAtMost && sensitivityRank(ctx.attributes.sensitivity) > sensitivityRank(sensitivityAtMost)) continue;
    if(timeWindow){ const now = new Date(); if(now < new Date(timeWindow.start) || now > new Date(timeWindow.end)) continue; }
    if(r.effect === 'deny'){ denyHit = r; break; }
    if(r.effect === 'allow'){ allowHit = r; }
  }
  if(denyHit) return { allowed: false, reason: denyHit.reason || 'Denied by policy', matchedRuleId: denyHit.id };
  if(allowHit) return { allowed: true, reason: allowHit.reason || 'Allowed by policy', matchedRuleId: allowHit.id };
  return { allowed: false, reason: 'Denied by default (no matching rule)' };
}
