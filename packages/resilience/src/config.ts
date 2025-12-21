import fs from 'node:fs';
import path from 'node:path';
import { ResiliencePlan } from './types';

export function loadPlan(planPath: string): ResiliencePlan {
  const resolved = path.resolve(planPath);
  const raw = fs.readFileSync(resolved, 'utf-8');
  const parsed = JSON.parse(raw) as ResiliencePlan;
  if (!Array.isArray(parsed.services) || parsed.services.length === 0) {
    throw new Error('Resilience plan must include at least one service');
  }
  return parsed;
}

export function findPlanPath(provided?: string): string {
  if (provided) {
    return provided;
  }
  return path.join(process.cwd(), 'packages', 'resilience', 'resilience-plan.json');
}
