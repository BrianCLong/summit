import { z } from 'zod';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export const AgentCharterSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  version: z.string(),
  authority: z.object({
    scopes: z.array(z.string()),
    maxBudgetUSD: z.number(),
    maxTokensPerRun: z.number(),
    expiryDate: z.string().datetime(),
  }),
  gates: z.object({
    requireHumanApprovalFor: z.array(z.string()),
    allowedTools: z.array(z.string()),
  }),
  ownerSignature: z.string(),
});

export type AgentCharter = z.infer<typeof AgentCharterSchema>;

export interface GateResult {
  allowed: boolean;
  reason?: string;
  opa_output?: any;
}

export class PolicyGate {
  private policyPath: string;

  constructor(policyPath?: string) {
    this.policyPath = policyPath || path.resolve(process.cwd(), 'policy/opa/runtime_agent.rego');
  }

  /**
   * Validate an action using OPA policy evaluation.
   */
  validate(charter: AgentCharter, actionType: string, params: any, currentSpendUSD: number, evidence?: any): GateResult {
    const input = {
      request: {
        tool: actionType,
        params
      },
      agent: {
        id: charter.agentId,
        autonomy_level: charter.authority.scopes.includes('autonomous') ? 3 : 1, // Simple mapping
      },
      authority: charter.authority,
      human_approval: {
        signed: params?.human_approval_signed || false
      },
      evidence: evidence || {
        claims_logging_uri: 'https://logs.summit.intelgraph.dev',
        audit_bundle_signed: true
      },
      data: {
          allowlist: {
              tools: charter.gates.allowedTools
          }
      }
    };

    // Prepare temp input file for OPA
    const inputPath = path.resolve(process.cwd(), '.opa_input.json');
    fs.writeFileSync(inputPath, JSON.stringify(input));

    try {
        // Run OPA evaluation
        // package runtime.agent_runtime
        const cmd = `opa eval -d ${this.policyPath} -i ${inputPath} "data.runtime.agent_runtime.deny"`;
        const result = execSync(cmd).toString();
        const opaOutput = JSON.parse(result);
        
        const denyMessages = opaOutput.result?.[0]?.expressions?.[0]?.value || [];

        if (denyMessages.length > 0) {
            return { 
                allowed: false, 
                reason: denyMessages.join(', '),
                opa_output: opaOutput
            };
        }

        return { allowed: true, opa_output: opaOutput };
    } catch (error: any) {
        return { allowed: false, reason: `OPA evaluation failed: ${error.message}` };
    } finally {
        if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
        }
    }
  }
}
