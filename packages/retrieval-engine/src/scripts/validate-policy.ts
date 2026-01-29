import { validatePolicyFile } from '../policy/validator.js';
import path from 'path';

const policyPath = process.argv[2] || path.join(process.cwd(), '../../policies/retrieval.gates.yaml');

try {
  console.log(`Validating policy at: ${policyPath}`);
  const policy = validatePolicyFile(policyPath);
  console.log('Policy is valid.');
  console.log(JSON.stringify(policy, null, 2));
  process.exit(0);
} catch (error) {
  console.error('Policy validation failed:', error);
  process.exit(1);
}
