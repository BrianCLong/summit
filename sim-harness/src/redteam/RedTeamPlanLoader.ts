import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
  DetectionRule,
  RedTeamScenarioDefinition,
} from '../types/index.js';
import { DEFAULT_DETECTION_RULES, DEFAULT_SCENARIOS } from './defaults.js';

export interface RedTeamPlan {
  scenarios: RedTeamScenarioDefinition[];
  detectionRules?: DetectionRule[];
  outputDir?: string;
  persistArtifacts?: boolean;
}

export class RedTeamPlanLoader {
  static load(planPath?: string): RedTeamPlan {
    if (!planPath) {
      return {
        scenarios: DEFAULT_SCENARIOS,
        detectionRules: DEFAULT_DETECTION_RULES,
      };
    }

    if (!fs.existsSync(planPath)) {
      throw new Error(`Red-team plan not found: ${planPath}`);
    }

    const ext = path.extname(planPath).toLowerCase();
    const rawContent = fs.readFileSync(planPath, 'utf8');

    let plan: Partial<RedTeamPlan>;
    if (ext === '.json') {
      plan = JSON.parse(rawContent) as Partial<RedTeamPlan>;
    } else if (ext === '.yaml' || ext === '.yml') {
      plan = yaml.load(rawContent) as Partial<RedTeamPlan>;
    } else {
      throw new Error(`Unsupported plan format: ${ext}`);
    }

    return {
      scenarios: plan.scenarios || DEFAULT_SCENARIOS,
      detectionRules: plan.detectionRules || DEFAULT_DETECTION_RULES,
      outputDir: plan.outputDir,
      persistArtifacts: plan.persistArtifacts,
    };
  }
}
