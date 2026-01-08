import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import { exit } from 'process';

const ExceptionTypeSchema = z.object({
  max_ttl_days: z.number().positive(),
  required_fields: z.array(z.string()),
  grace_period_days: z.number().nonnegative(),
});

const PolicySchema = z.object({
  policy_version: z.string(),
  enforcement_mode: z.enum(['report_only', 'fail_on_violation']),
  exception_types: z.record(z.string(), ExceptionTypeSchema),
  allowlist: z.array(z.object({
    id: z.string(),
    owner: z.string(),
    expires_at: z.string().datetime(),
    rationale: z.string(),
  })).optional(),
});

const validatePolicy = () => {
  const policyPath = 'ci/exception-lifecycle-policy.yml';
  try {
    if (!fs.existsSync(policyPath)) {
        console.error(`Policy file not found at ${policyPath}`);
        exit(1);
    }
    const fileContents = fs.readFileSync(policyPath, 'utf8');
    const data = yaml.load(fileContents);
    PolicySchema.parse(data);
    console.log(`Policy ${policyPath} is valid.`);
  } catch (e) {
      console.error(`Validation failed for ${policyPath}:`);
      console.log(JSON.stringify(e, null, 2));
      exit(1);
  }
};

validatePolicy();
