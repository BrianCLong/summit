import receiptSchemaJson from "../../../prov-ledger/schema/receipt.v0.1.json";
import type { SummitClient } from "./client/SummitClient.js";
import { FromSchema } from "./schemaTypes.js";

const _receiptSchema = receiptSchemaJson as unknown as ReceiptSchema;

export type ProvenanceReceipt = FromSchema<typeof _receiptSchema>;

export interface ReceiptStatus {
  id: string;
  status: "pending" | "accepted" | "recorded" | "failed";
  receipt?: ProvenanceReceipt;
  error?: string;
}

export interface ReceiptSubmissionResponse {
  receipt: ProvenanceReceipt;
  status: "accepted" | "recorded";
}

export class ReceiptsClient {
  private basePath = "/api/provenance/receipts";

  constructor(private readonly client: SummitClient) {}

  /**
   * Submit a signed provenance receipt to the platform.
   */
  public async submitReceipt(receipt: ProvenanceReceipt): Promise<ReceiptSubmissionResponse> {
    const response = await this.client.post<ReceiptSubmissionResponse>(this.basePath, receipt);
    return response.data;
  }

  /**
   * Retrieve the latest status for a previously submitted receipt.
   *
   * TODO: Update the endpoint path if a dedicated receipt status route is introduced.
   */
  public async getReceiptStatus(receiptId: string): Promise<ReceiptStatus> {
    const response = await this.client.get<ReceiptStatus>(`${this.basePath}/${receiptId}`);
    return response.data;
  }
}

type ReceiptSchema = {
  readonly type: "object";
  readonly additionalProperties: false;
  readonly properties: {
    readonly id: {
      readonly type: "string";
      readonly description: string;
      readonly pattern: string;
    };
    readonly version: {
      readonly type: "string";
      readonly enum: readonly ["0.1.0"];
      readonly default: "0.1.0";
    };
    readonly caseId: { readonly type: "string"; readonly description: string };
    readonly claimIds: {
      readonly type: "array";
      readonly description: string;
      readonly items: { readonly type: "string" };
      readonly minItems: 1;
    };
    readonly createdAt: {
      readonly type: "string";
      readonly format: "date-time";
      readonly description: string;
    };
    readonly actor: {
      readonly type: "object";
      readonly description: string;
      readonly additionalProperties: false;
      readonly properties: {
        readonly id: { readonly type: "string" };
        readonly role: { readonly type: "string" };
        readonly tenantId: { readonly type: "string" };
        readonly displayName: { readonly type: "string" };
      };
      readonly required: readonly ["id", "role"];
    };
    readonly pipeline: {
      readonly type: "object";
      readonly description: string;
      readonly additionalProperties: false;
      readonly properties: {
        readonly stage: { readonly type: "string" };
        readonly runId: { readonly type: "string" };
        readonly taskId: { readonly type: "string" };
        readonly step: { readonly type: "string" };
      };
    };
    readonly payloadHash: {
      readonly type: "string";
      readonly description: string;
      readonly pattern: string;
    };
    readonly signature: {
      readonly type: "object";
      readonly description: string;
      readonly additionalProperties: false;
      readonly properties: {
        readonly algorithm: {
          readonly type: "string";
          readonly enum: readonly ["ed25519"];
          readonly description: string;
        };
        readonly keyId: { readonly type: "string"; readonly description: string };
        readonly publicKey: { readonly type: "string"; readonly description: string };
        readonly value: { readonly type: "string"; readonly description: string };
        readonly signedAt: { readonly type: "string"; readonly format: "date-time" };
      };
      readonly required: readonly ["algorithm", "keyId", "publicKey", "value", "signedAt"];
    };
    readonly proofs: {
      readonly type: "object";
      readonly description: string;
      readonly additionalProperties: false;
      readonly properties: {
        readonly receiptHash: {
          readonly type: "string";
          readonly pattern: string;
          readonly description: string;
        };
        readonly manifestMerkleRoot: {
          readonly type: "string";
          readonly pattern: string;
          readonly description: string;
        };
        readonly claimHashes: {
          readonly type: "array";
          readonly items: { readonly type: "string"; readonly pattern: string };
          readonly description: string;
        };
      };
      readonly required: readonly ["receiptHash"];
    };
    readonly metadata: {
      readonly type: "object";
      readonly description: string;
      readonly additionalProperties: true;
    };
    readonly redactions: {
      readonly type: "array";
      readonly description: string;
      readonly items: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
          readonly path: { readonly type: "string" };
          readonly reason: { readonly type: "string" };
          readonly appliedAt: { readonly type: "string"; readonly format: "date-time" };
          readonly appliedBy: { readonly type: "string" };
        };
        readonly required: readonly ["path", "reason"];
      };
    };
  };
  readonly required: readonly [
    "id",
    "version",
    "caseId",
    "claimIds",
    "createdAt",
    "actor",
    "payloadHash",
    "signature",
    "proofs",
  ];
};
