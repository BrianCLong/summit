import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ProvenanceReceiptSchema, PolicyDecisionSchema } from '../src/schemas/v1/definitions';

describe('Schema Generation', () => {
  it('ProvenanceReceiptSchema should contain required top-level keys and version metadata', () => {
    const jsonSchema = zodToJsonSchema(ProvenanceReceiptSchema, {
       $refStrategy: 'none'
    });

    const finalSchema = {
      $id: "https://intelgraph.dev/schemas/provenance/receipt.schema.json",
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "ProvenanceReceipt",
      ...jsonSchema,
    };

    expect(finalSchema.$id).toBe("https://intelgraph.dev/schemas/provenance/receipt.schema.json");
    expect(finalSchema.title).toBe("ProvenanceReceipt");
    expect(finalSchema.type).toBe("object");
    expect(finalSchema.required).toEqual(expect.arrayContaining(["id", "payload", "payloadHash", "issuedAt", "signature", "signer"]));
  });

  it('PolicyDecisionSchema should contain required top-level keys and version metadata', () => {
    const jsonSchema = zodToJsonSchema(PolicyDecisionSchema, {
       $refStrategy: 'none'
    });

     const finalSchema = {
      $id: "https://summit.dev/schemas/policy-decision",
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "Policy Decision",
      ...jsonSchema,
    };

    expect(finalSchema.$id).toBe("https://summit.dev/schemas/policy-decision");
    expect(finalSchema.title).toBe("Policy Decision");
    expect(finalSchema.type).toBe("object");
    expect(finalSchema.required).toEqual(expect.arrayContaining(["id", "timestamp", "policy", "input", "result"]));
  });
});
