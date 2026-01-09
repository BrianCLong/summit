import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

// Paths
const POLICY_PATH = process.env.POLICY_PATH || 'policies/promotion-policy.yml';
const POLICY_SCHEMA_PATH = process.env.POLICY_SCHEMA_PATH || 'policies/schemas/promotion-policy.schema.json';
const DECISION_SCHEMA_PATH = process.env.DECISION_SCHEMA_PATH || 'release/schema/promotion-decision.schema.json';
const OUTPUT_PATH = process.env.OUTPUT_PATH || 'artifacts/promotion/promotion-decision.json';

// Interfaces
interface Policy {
  version: string;
  environments: {
    [key: string]: EnvironmentRules;
  };
}

interface EnvironmentRules {
  approvals: {
    min_count: number;
    allowed_teams?: string[];
    allowed_users?: string[];
    allow_self_approval: boolean;
  };
  change_window?: {
    timezone: string;
    days: string[];
    start_time: string;
    end_time: string;
  };
  checks: string[];
  emergency_override?: {
    enabled: boolean;
    min_approvals: number;
    max_age_hours: number;
  };
}

interface Context {
  environment: string;
  actor: string;
  approvals: string[]; // List of usernames
  checks_status: { [key: string]: string }; // check_name: status (success, failure)
  commit_sha: string;
  version: string;
  timestamp: string; // ISO string
  override?: {
    active: boolean;
    justification: string;
  };
  workflow_metadata: {
    run_id: string;
    url: string;
  };
}

interface Decision {
  release_manifest_id: {
    commit_sha: string;
    version: string;
  };
  target_environment: string;
  policy_version: string;
  evaluation_result: {
    verdict: 'ALLOW' | 'DENY';
    reasons: { code: string; message: string }[];
  };
  approvers: { user: string; role: string; approved_at: string }[];
  override_details?: {
    active: boolean;
    justification: string;
    approvers: string[];
  };
  timestamp: string;
  workflow_metadata: {
    run_id: string;
    actor: string;
    url: string;
  };
}

// Helper to load file
function loadFile(filepath: string): any {
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`);
  }
  return fs.readFileSync(filepath, 'utf8');
}

// Helper to validate schema
function validateSchema(data: any, schemaPath: string) {
  const schema = JSON.parse(loadFile(schemaPath));
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    throw new Error(`Schema validation failed for ${schemaPath}: ${JSON.stringify(validate.errors)}`);
  }
}

// Helper to check time window
function isInsideWindow(timestamp: string, window: NonNullable<EnvironmentRules['change_window']>): boolean {
  const date = new Date(timestamp);
  // Simple simulation for now, assuming UTC if timezone matches
  // In a real implementation, use libraries like 'moment-timezone' or 'luxon'

  // Convert day index to string
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[date.getUTCDay()];

  if (!window.days.includes(dayName)) return false;

  const currentMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();

  const [startH, startM] = window.start_time.split(':').map(Number);
  const startMinutes = startH * 60 + startM;

  const [endH, endM] = window.end_time.split(':').map(Number);
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

// Main Evaluation Logic
function evaluate(policy: Policy, context: Context): Decision {
  const rules = policy.environments[context.environment];
  const reasons: { code: string; message: string }[] = [];
  let verdict: 'ALLOW' | 'DENY' = 'ALLOW';

  if (!rules) {
    return {
      release_manifest_id: { commit_sha: context.commit_sha, version: context.version },
      target_environment: context.environment,
      policy_version: policy.version,
      evaluation_result: {
        verdict: 'DENY',
        reasons: [{ code: 'ENV_NOT_DEFINED', message: `No policy defined for environment: ${context.environment}` }]
      },
      approvers: [],
      timestamp: new Date().toISOString(),
      workflow_metadata: { ...context.workflow_metadata, actor: context.actor }
    };
  }

  // 1. Emergency Override
  if (context.override?.active) {
    if (!rules.emergency_override?.enabled) {
      verdict = 'DENY';
      reasons.push({ code: 'OVERRIDE_DISABLED', message: 'Emergency override is not enabled for this environment' });
    } else {
       // Check override approvals (mock logic: assuming input approvals are valid for override if count is sufficient)
       if (context.approvals.length < rules.emergency_override.min_approvals) {
         verdict = 'DENY';
         reasons.push({
           code: 'INSUFFICIENT_OVERRIDE_APPROVALS',
           message: `Emergency override requires ${rules.emergency_override.min_approvals} approvals, got ${context.approvals.length}`
         });
       } else {
           // Override accepted
           reasons.push({ code: 'OVERRIDE_ACCEPTED', message: 'Emergency override accepted' });
       }
    }
  } else {
    // Normal Path

    // 2. Approvals
    if (context.approvals.length < rules.approvals.min_count) {
      verdict = 'DENY';
      reasons.push({
        code: 'INSUFFICIENT_APPROVALS',
        message: `Requires ${rules.approvals.min_count} approvals, got ${context.approvals.length}`
      });
    }

    // Separation of duties
    if (!rules.approvals.allow_self_approval && context.approvals.includes(context.actor)) {
       verdict = 'DENY';
       reasons.push({
         code: 'SELF_APPROVAL_FORBIDDEN',
         message: `Actor ${context.actor} cannot approve their own promotion`
       });
    }

    // 3. Change Window
    if (rules.change_window) {
      if (!isInsideWindow(context.timestamp, rules.change_window)) {
        verdict = 'DENY';
        reasons.push({
          code: 'OUTSIDE_CHANGE_WINDOW',
          message: `Current time ${context.timestamp} is outside allowed window`
        });
      }
    }

    // 4. Required Checks
    for (const check of rules.checks) {
      if (context.checks_status[check] !== 'success') {
        verdict = 'DENY';
        reasons.push({
          code: 'CHECK_FAILED',
          message: `Required check '${check}' is not green (status: ${context.checks_status[check] || 'missing'})`
        });
      }
    }
  }

  return {
    release_manifest_id: { commit_sha: context.commit_sha, version: context.version },
    target_environment: context.environment,
    policy_version: policy.version,
    evaluation_result: { verdict, reasons },
    approvers: context.approvals.map(user => ({ user, role: 'approver', approved_at: new Date().toISOString() })),
    override_details: context.override,
    timestamp: new Date().toISOString(),
    workflow_metadata: { ...context.workflow_metadata, actor: context.actor }
  };
}


// Execution
try {
  console.log("Loading policy from:", POLICY_PATH);
  const policyYaml = loadFile(POLICY_PATH);
  const policy = yaml.load(policyYaml) as Policy;

  console.log("Validating policy schema...");
  validateSchema(policy, POLICY_SCHEMA_PATH);

  // Load Context (from environment variable or default for testing)
  const contextJson = process.env.PROMOTION_CONTEXT;
  let context: Context;

  if (contextJson) {
      context = JSON.parse(contextJson);
  } else {
      console.log("No PROMOTION_CONTEXT provided, running in simulation mode with mock data.");
      context = {
          environment: 'production',
          actor: 'developer1',
          approvals: ['approver1', 'approver2'],
          checks_status: {
              "Release Promotion Guard": "success",
              "CI Core": "success",
              "Security Scan": "success"
          },
          commit_sha: "abcdef123456",
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          workflow_metadata: {
              run_id: "12345",
              url: "https://github.com/org/repo/actions/runs/12345"
          }
      };
  }

  console.log("Evaluating policy for environment:", context.environment);
  const decision = evaluate(policy, context);

  // Validate decision schema
  console.log("Validating decision record schema...");
  validateSchema(decision, DECISION_SCHEMA_PATH);

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(decision, null, 2));
  console.log(`Decision record written to: ${OUTPUT_PATH}`);

  console.log("Verdict:", decision.evaluation_result.verdict);
  if (decision.evaluation_result.verdict === 'DENY') {
      console.error("Promotion DENIED. Reasons:");
      decision.evaluation_result.reasons.forEach(r => console.error(`- [${r.code}] ${r.message}`));
      process.exit(1);
  } else {
      console.log("Promotion ALLOWED.");
  }

} catch (error) {
  console.error("Policy evaluation failed:", error);
  process.exit(1);
}
