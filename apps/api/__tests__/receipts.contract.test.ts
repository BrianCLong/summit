import { createHash } from "crypto";
import request from "supertest";
import {
  SignCommand,
  VerifyCommand,
  type KMSClient,
  type SignCommandInput,
  type VerifyCommandInput,
} from "@aws-sdk/client-kms";
import {
  RECEIPT_SCHEMA_VERSION,
  type ProvenanceReceipt,
  type UnsignedReceipt,
} from "@intelgraph/provenance";
import { ReceiptSigner, canonicaliseReceipt } from "@intelgraph/receipt-signer";

import { buildApp } from "../src/app.js";
import { InMemoryReceiptRepository } from "../src/routes/receipts/get.js";

class FakeKmsClient {
  public lastSign?: SignCommandInput;
  public lastVerify?: VerifyCommandInput;
  constructor(
    private readonly signature: Uint8Array = new Uint8Array(Buffer.from("api-signature"))
  ) {}

  async send(command: SignCommand | VerifyCommand) {
    if (command instanceof SignCommand) {
      this.lastSign = command.input;
      return {
        Signature: this.signature,
        SigningAlgorithm: command.input.SigningAlgorithm,
      };
    }

    if (command instanceof VerifyCommand) {
      this.lastVerify = command.input;
      return { SignatureValid: true };
    }

    throw new Error("Unexpected command");
  }

  destroy(): void {
    /* noop */
  }
}

const unsignedReceipt: UnsignedReceipt = {
  id: "05f0f66e-6240-4c3b-8c26-14fb24f2a5cb",
  schemaVersion: RECEIPT_SCHEMA_VERSION,
  issuer: "kms:alias/provenance-signing",
  subject: "artifact:ingest/2001",
  issuedAt: "2025-01-05T00:00:00.000Z",
  payload: {
    artifactHash: "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    manifestUri: "https://example.test/manifests/2001.json",
    nonce: "nonce-9876543210",
  },
};

describe("GET /receipts/:id", () => {
  it("returns 404 when no receipt exists", async () => {
    const signer = new ReceiptSigner({
      kmsKeyId: "alias/provenance-key",
      client: new FakeKmsClient() as unknown as KMSClient,
    });
    const app = buildApp({
      signer,
      repository: new InMemoryReceiptRepository([]),
    });

    await request(app).get("/receipts/missing").expect(404);
  });

  it("returns a signed payload and signature", async () => {
    const fakeKms = new FakeKmsClient();
    const signer = new ReceiptSigner({
      kmsKeyId: "alias/provenance-key",
      client: fakeKms as unknown as KMSClient,
    });
    const app = buildApp({
      signer,
      repository: new InMemoryReceiptRepository([unsignedReceipt]),
    });

    const response = await request(app).get(`/receipts/${unsignedReceipt.id}`).expect(200);

    const body = response.body as ProvenanceReceipt;
    expect(body.id).toBe(unsignedReceipt.id);
    expect(body.signature.value).toBe(Buffer.from("api-signature").toString("base64"));
    expect(fakeKms.lastSign?.MessageType).toBe("DIGEST");

    const canonical = canonicaliseReceipt(body);
    const digest = createHash("sha256").update(canonical).digest("hex");
    expect(body.signature.messageDigest).toBe(digest);
  });
});
