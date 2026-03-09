import { createHash, randomUUID } from 'node:crypto';
import cbor from 'cbor';

export interface ActionReceipt {
  receipt_id: string;
  timestamp: string;
  tool_id: string;
  server_id?: string;
  capability: string;
  input_digest: string;
  output_digest: string;
  status: 'success' | 'failure';
  error_category?: string;
  metadata?: Record<string, unknown>;
  hash: string;
}

export interface ActionReceiptInput {
  toolId: string;
  capability: string;
  inputDigest: string;
  outputDigest: string;
  status: 'success' | 'failure';
  errorCategory?: string;
  metadata?: Record<string, unknown>;
  serverId?: string;
}

export function createActionReceipt(input: ActionReceiptInput): ActionReceipt {
  const timestamp = new Date().toISOString();
  const receiptId = `receipt-${randomUUID()}`;

  const payload = {
    receipt_id: receiptId,
    timestamp,
    tool_id: input.toolId,
    server_id: input.serverId,
    capability: input.capability,
    input_digest: input.inputDigest,
    output_digest: input.outputDigest,
    status: input.status,
    error_category: input.errorCategory,
    metadata: input.metadata
  };

  // Canonical structure for hashing using CBOR
  const buffer = cbor.encodeCanonical(payload);
  const hash = createHash('sha256').update(buffer).digest('hex');

  return {
    ...payload,
    hash
  };
}

export function computeDigest(data: unknown): string {
  let content: string | Buffer;
  if (typeof data === 'string') {
    content = data;
  } else if (Buffer.isBuffer(data)) {
    content = data;
  } else {
    // Use JSON.stringify for object inputs to be consistent with simple use cases
    content = JSON.stringify(data);
  }
  return createHash('sha256').update(content).digest('hex');
}
