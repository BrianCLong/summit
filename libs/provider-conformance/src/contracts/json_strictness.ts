import Ajv from 'ajv';
import type { ContractContext, ContractResult, ProviderAdapter } from '../types.js';
import { safeJsonParse } from '../utils.js';
import type { ContractTest } from './types.js';

const schema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    source: { type: 'string' },
  },
  required: ['ok', 'source'],
  additionalProperties: false,
};

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

export const jsonStrictnessContract: ContractTest = {
  id: 'json_strictness',
  description: 'Verify JSON mode/schema adherence',
  run: async (adapter: ProviderAdapter, context: ContractContext): Promise<ContractResult> => {
    const prompt =
      'Return JSON that matches the schema with keys ok (boolean) and source (string).';
    const response = await adapter.run({
      prompt,
      maxTokens: 64,
      temperature: 0,
      jsonSchema: schema,
    });

    const rawText = response.text ?? '';
    const parsed = safeJsonParse(rawText);
    const valid = parsed ? validate(parsed) : false;

    return {
      id: 'json_strictness',
      passed: Boolean(valid),
      details: valid
        ? 'Provider returned schema-conformant JSON.'
        : 'Provider did not return schema-conformant JSON.',
      capabilities: {
        jsonMode: Boolean(valid),
      },
      metadata: {
        responsePreview: rawText.slice(0, 120),
        promptHash: context.promptHash(prompt),
        request: {
          maxTokens: 64,
          temperature: 0,
          jsonSchema: true,
        },
        response: {
          headerKeys: Object.keys(response.headers),
        },
      },
    };
  },
};
