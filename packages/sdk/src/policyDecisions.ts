import policyDecisionSchemaJson from '../../../schemas/policy-decision.schema.json';
import type { SummitClient } from './client/SummitClient.js';
import { FromSchema } from './schemaTypes.js';

const _policyDecisionSchema = policyDecisionSchemaJson as unknown as PolicyDecisionSchema;

export type PolicyDecision = FromSchema<typeof _policyDecisionSchema>;

export interface PolicyDecisionRequest {
  input: PolicyDecision['input'];
  policyPackage: string;
  policyVersion: string;
  rule?: string;
  metadata?: Record<string, unknown>;
}

export class PolicyDecisionsClient {
  private basePath = '/api/policy/decisions';

  constructor(private readonly client: SummitClient) {}

  /**
   * Request an authoritative policy decision for the provided input payload.
   */
  public async requestDecision(request: PolicyDecisionRequest): Promise<PolicyDecision> {
    const response = await this.client.post<PolicyDecision>(this.basePath, {
      input: request.input,
      policy: {
        package: request.policyPackage,
        version: request.policyVersion,
        rule: request.rule,
      },
      metadata: request.metadata,
    });

    return response.data;
  }
}

type PolicyDecisionSchema = {
  readonly $id: string;
  readonly $schema: string;
  readonly title: string;
  readonly type: 'object';
  readonly required: readonly ['id', 'timestamp', 'policy', 'input', 'result'];
  readonly additionalProperties: false;
  readonly properties: {
    readonly id: { readonly type: 'string'; readonly pattern: string };
    readonly timestamp: { readonly type: 'string'; readonly format: 'date-time' };
    readonly policy: {
      readonly type: 'object';
      readonly required: readonly ['package', 'version'];
      readonly additionalProperties: false;
      readonly properties: {
        readonly package: { readonly type: 'string' };
        readonly version: { readonly type: 'string' };
        readonly rule: { readonly type: 'string' };
      };
    };
    readonly input: { readonly type: 'object'; readonly additionalProperties: true };
    readonly result: {
      readonly type: 'object';
      readonly required: readonly ['allow'];
      readonly additionalProperties: false;
      readonly properties: {
        readonly allow: { readonly type: 'boolean' };
        readonly reasons: { readonly type: 'array'; readonly items: { readonly type: 'string' } };
        readonly metadata: { readonly type: 'object'; readonly additionalProperties: true };
      };
    };
  };
};
