import { loadPolicy } from '@open-policy-agent/opa-wasm';
import { readFileSync } from 'fs';
import { join } from 'path';

let policy: any;

export const checkPolicy = async (input: any): Promise<boolean> => {
  if (!policy) {
    const policyWasm = readFileSync(join(__dirname, 'policy.wasm'));
    policy = await loadPolicy(policyWasm);
  }

  const result = policy.evaluate(input);

  if (result && result.length > 0 && result[0].result) {
    return result[0].result.allow;
  }

  return false;
};
