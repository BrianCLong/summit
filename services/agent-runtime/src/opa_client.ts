import { z } from 'zod';

const OPA_URL = process.env.OPA_URL || 'http://localhost:8181';

const OpaResponseSchema = z.object({
  result: z.object({
    allow: z.boolean().optional(),
    deny: z.array(z.string()).optional(),
    violation: z.array(z.string()).optional(),
  }).optional(),
});

export type OpaInput = {
  request: { tool: string };
  agent: { autonomy_level: number };
  human_approval: { signed: boolean };
  evidence: {
    claims_logging_uri?: string;
    audit_bundle_signed: boolean;
  };
};

export async function evaluate(input: OpaInput) {
  try {
    const response = await fetch(`${OPA_URL}/v1/data/runtime/agent_runtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      throw new Error(`OPA request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return OpaResponseSchema.parse(data);
  } catch (error) {
    console.error('OPA evaluation error:', error);
    // Fail closed if OPA is unreachable
    return { result: { deny: ['OPA unavailable'] } };
  }
}
