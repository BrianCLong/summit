import { Entity } from './index.js';

interface PolicyRule {
    id: string;
    type: string;
    fields: string[];
}

export interface Policy {
    rules: PolicyRule[];
}

export function parsePolicy(policyStr: string): Policy {
    const lines = policyStr.split('\n');
    const rules: PolicyRule[] = [];

    let currentRule: any = null;
    for (const line of lines) {
        if (line.trim().startsWith('- id:')) {
            if (currentRule) rules.push(currentRule);
            currentRule = { id: line.split(':')[1].trim(), fields: [] };
        } else if (line.trim().startsWith('type:')) {
            if (currentRule) currentRule.type = line.split(':')[1].trim().replace(/["']/g, '');
        } else if (line.trim().startsWith('fields:')) {
            if (currentRule) {
                const fieldStr = line.split(':')[1].trim().replace(/[\[\]]/g, '');
                currentRule.fields = fieldStr.split(',').map((f: string) => f.trim().replace(/["']/g, ''));
            }
        }
    }
    if (currentRule) rules.push(currentRule);

    return { rules };
}

export function evaluateMerge(e1: Entity, e2: Entity, policy: Policy): boolean {
    for (const rule of policy.rules) {
        if (rule.type === 'exact_match') {
            for (const field of rule.fields) {
                if ((e1 as any)[field] === undefined || (e2 as any)[field] === undefined) return false;
                if ((e1 as any)[field] !== (e2 as any)[field]) return false;
            }
            return true;
        }
    }
    return false;
}

export function mergeEntities(e1: Entity, e2: Entity, policyVersion: string): any {
    return {
        event: 'MERGE_EVENT',
        policy: policyVersion,
        surviving: { ...e1, ...e2 },
        discarded: [e1.id, e2.id]
    };
}
