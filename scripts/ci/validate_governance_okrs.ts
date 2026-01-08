import fs from 'fs';
import yaml from 'js-yaml';

// Manually validating because Zod v4 in this environment is unstable/broken
const validateGovernanceOkrs = () => {
  try {
    const fileContents = fs.readFileSync('ci/governance-okrs.yml', 'utf8');
    const data = yaml.load(fileContents) as any;

    if (!data.quarter_id) throw new Error('Missing quarter_id');
    if (!data.objectives || !Array.isArray(data.objectives)) throw new Error('Missing or invalid objectives');
    if (!data.sla_commitments) throw new Error('Missing sla_commitments');

    data.objectives.forEach((obj: any, idx: number) => {
       if (!obj.id) throw new Error(`Objective ${idx} missing id`);
       if (!obj.key_results || !Array.isArray(obj.key_results)) throw new Error(`Objective ${idx} missing key_results`);
       obj.key_results.forEach((kr: any, kridx: number) => {
           if (!kr.metric_id) throw new Error(`Objective ${idx} KR ${kridx} missing metric_id`);
           if (typeof kr.target !== 'number' && typeof kr.target !== 'boolean') throw new Error(`Objective ${idx} KR ${kridx} invalid target`);
       });
    });

    console.log('Governance OKRs policy is valid.');
  } catch (e) {
    console.error('Validation failed:', e);
    process.exit(1);
  }
};

validateGovernanceOkrs();
