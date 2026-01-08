// @ts-nocheck
import {
  RECEIPT_VERSION,
  Receipt,
  ReceiptSignature,
  RedactionRule,
  applyRedactions,
  computeReceiptHash,
  computeReceiptPayloadHash,
} from "@intelgraph/provenance";
import {
  generateKeyPairSync,
  randomUUID,
  sign as signCrypto,
  verify as verifyCrypto,
} from "crypto";
import { Manifest } from "./ledger";

export interface ReceiptContext {
  caseId?: string;
  claimIds: string[];
  actor: {
    id: string;
    role: string;
    tenantId?: string;
  };
  pipeline?: {
    stage?: string;
    runId?: string;
    taskId?: string;
    step?: string;
  };
  metadata?: Record<string, unknown>;
  redactions?: RedactionRule[];
}

export interface ReceiptSigner {
  sign(payloadHash: string): Promise<ReceiptSignature>;
  verify?(payloadHash: string, signature: ReceiptSignature): Promise<boolean>;
}

class LocalReceiptSigner implements ReceiptSigner {
  private readonly privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"];

  private readonly publicKey: string;

  private readonly keyId: string;

  constructor(keyId = "local-dev") {
    this.keyId = keyId;
    const pair = generateKeyPairSync("ed25519");
    this.privateKey = pair.privateKey;
    this.publicKey = pair.publicKey.export({ type: "spki", format: "der" }).toString("base64");
  }

  async sign(payloadHash: string): Promise<ReceiptSignature> {
    const signedAt = new Date().toISOString();
    const value = signCrypto(null, Buffer.from(payloadHash, "hex"), this.privateKey).toString(
      "base64"
    );
    return {
      algorithm: "ed25519",
      keyId: this.keyId,
      publicKey: this.publicKey,
      value,
      signedAt,
    };
  }

  async verify(payloadHash: string, signature: ReceiptSignature): Promise<boolean> {
    return verifyCrypto(
      null,
      Buffer.from(payloadHash, "hex"),
      {
        key: Buffer.from(signature.publicKey, "base64"),
        format: "der",
        type: "spki",
      },
      Buffer.from(signature.value, "base64")
    );
  }
}

export class HttpReceiptSigner implements ReceiptSigner {
  constructor(private readonly baseUrl: string) {}

  async sign(payloadHash: string): Promise<ReceiptSignature> {
    const res = await fetch(`${this.baseUrl}/sign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload: payloadHash }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to sign payload: ${res.status} ${body}`);
    }

    const json = (await res.json()) as { signature: ReceiptSignature };
    return json.signature;
  }
}

const receiptStore = new Map<string, Receipt>();
const defaultSigner: ReceiptSigner = process.env.SIGNER_URL
  ? new HttpReceiptSigner(process.env.SIGNER_URL)
  : new LocalReceiptSigner();

export async function issueReceipt(
  manifest: Manifest,
  context: ReceiptContext,
  signer: ReceiptSigner = defaultSigner
): Promise<Receipt> {
  const issuedAt = new Date().toISOString();
  const receiptBase: Receipt = {
    id: randomUUID(),
    version: RECEIPT_VERSION,
    caseId: context.caseId ?? "unassigned",
    claimIds: context.claimIds,
    createdAt: issuedAt,
    actor: context.actor,
    pipeline: context.pipeline,
    payloadHash: "",
    signature: {
      algorithm: "ed25519",
      keyId: "pending",
      publicKey: "",
      value: "",
      signedAt: issuedAt,
    },
    proofs: {
      receiptHash: "",
      manifestMerkleRoot: manifest.merkleRoot,
      claimHashes: manifest.claims.map((c) => c.hash),
    },
    metadata: context.metadata,
    redactions: context.redactions,
  };

  const payloadHash = computeReceiptPayloadHash(receiptBase);
  const signature = await signer.sign(payloadHash);

  const signed: Receipt = {
    ...receiptBase,
    payloadHash,
    signature,
  };

  signed.proofs.receiptHash = computeReceiptHash(signed);

  receiptStore.set(signed.id, signed);
  return signed;
}

export function getReceipt(id: string): Receipt | undefined {
  return receiptStore.get(id);
}

export function listReceipts(ids?: string[]): Receipt[] {
  if (!ids) return Array.from(receiptStore.values());
  return ids.map((id) => receiptStore.get(id)).filter((r): r is Receipt => Boolean(r));
}

export function redactReceipt(receipt: Receipt, redactions: RedactionRule[] = []): Receipt {
  return applyRedactions(receipt, [...(receipt.redactions ?? []), ...redactions]);
}
