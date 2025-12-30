import crypto from 'node:crypto';

type Primitive = string | number | boolean | null;

export interface ReceiptLineItem {
  sku?: string;
  description?: string;
  quantity?: number;
  amountMinor: number;
}

export interface ReceiptIdempotencyInput {
  ruleVersion: string;
  receiptHash?: string;
  receiptId?: string;
  occurredAt?: string;
  currency?: string;
  totalMinor?: number;
  paymentMethod?: string;
  merchantId?: string;
  lineItems?: ReadonlyArray<ReceiptLineItem>;
  attributes?: Record<string, Primitive>;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const serializedItems = value.map((item) => stableStringify(item));
    return `[${serializedItems.join(',')}]`;
  }

  const sortedKeys = Object.keys(value).sort();
  const serializedPairs = sortedKeys.map((key) => {
    const serializedValue = stableStringify((value as Record<string, unknown>)[key]);
    return `${JSON.stringify(key)}:${serializedValue}`;
  });

  return `{${serializedPairs.join(',')}}`;
}

function normalizeLineItems(lineItems?: ReadonlyArray<ReceiptLineItem>): Array<ReceiptLineItem> {
  if (!lineItems) {
    return [];
  }

  return lineItems
    .map((item) => ({
      sku: item.sku ?? undefined,
      description: item.description?.trim() || undefined,
      quantity: typeof item.quantity === 'number' ? item.quantity : 1,
      amountMinor: item.amountMinor,
    }))
    .sort((a, b) => {
      const skuCompare = (a.sku ?? '').localeCompare(b.sku ?? '');
      if (skuCompare !== 0) return skuCompare;

      const descCompare = (a.description ?? '').localeCompare(b.description ?? '');
      if (descCompare !== 0) return descCompare;

      if (a.amountMinor !== b.amountMinor) return a.amountMinor - b.amountMinor;

      return a.quantity - b.quantity;
    });
}

function assertRequiredFields(input: ReceiptIdempotencyInput): asserts input is ReceiptIdempotencyInput & {
  occurredAt: string;
  currency: string;
  totalMinor: number;
} {
  if (!input.ruleVersion) {
    throw new Error('ruleVersion is required to derive a posting key');
  }

  if (input.receiptHash) {
    return;
  }

  if (!input.occurredAt || !input.currency || typeof input.totalMinor !== 'number') {
    throw new Error('receiptHash or occurredAt, currency, and totalMinor are required to derive a posting key');
  }
}

function buildCanonicalSnapshot(input: ReceiptIdempotencyInput) {
  const lineItems = normalizeLineItems(input.lineItems);
  return {
    ruleVersion: input.ruleVersion,
    receiptId: input.receiptId ?? null,
    occurredAt: input.occurredAt ?? null,
    currency: input.currency ?? null,
    totalMinor: input.totalMinor ?? null,
    paymentMethod: input.paymentMethod?.toLowerCase() ?? null,
    merchantId: input.merchantId ?? null,
    lineItems,
    attributes: input.attributes ?? {},
  };
}

export function derivePostingKey(input: ReceiptIdempotencyInput): string {
  assertRequiredFields(input);

  const canonicalPayload = input.receiptHash
    ? { ruleVersion: input.ruleVersion, receiptHash: input.receiptHash }
    : buildCanonicalSnapshot(input);

  const serializedPayload = stableStringify(canonicalPayload);
  const digest = crypto.createHash('sha256').update(serializedPayload).digest('hex');
  return `posting_${digest}`;
}

export function snapshotForKey(input: ReceiptIdempotencyInput): string {
  assertRequiredFields(input);

  if (input.receiptHash) {
    return stableStringify({ ruleVersion: input.ruleVersion, receiptHash: input.receiptHash });
  }

  return stableStringify(buildCanonicalSnapshot(input));
}
