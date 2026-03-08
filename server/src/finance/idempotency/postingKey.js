"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.derivePostingKey = derivePostingKey;
exports.snapshotForKey = snapshotForKey;
const node_crypto_1 = __importDefault(require("node:crypto"));
function stableStringify(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        const serializedItems = value.map((item) => stableStringify(item));
        return `[${serializedItems.join(',')}]`;
    }
    const sortedKeys = Object.keys(value).sort();
    const serializedPairs = sortedKeys.map((key) => {
        const serializedValue = stableStringify(value[key]);
        return `${JSON.stringify(key)}:${serializedValue}`;
    });
    return `{${serializedPairs.join(',')}}`;
}
function normalizeLineItems(lineItems) {
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
        if (skuCompare !== 0)
            return skuCompare;
        const descCompare = (a.description ?? '').localeCompare(b.description ?? '');
        if (descCompare !== 0)
            return descCompare;
        if (a.amountMinor !== b.amountMinor)
            return a.amountMinor - b.amountMinor;
        return a.quantity - b.quantity;
    });
}
function assertRequiredFields(input) {
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
function buildCanonicalSnapshot(input) {
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
function derivePostingKey(input) {
    assertRequiredFields(input);
    const canonicalPayload = input.receiptHash
        ? { ruleVersion: input.ruleVersion, receiptHash: input.receiptHash }
        : buildCanonicalSnapshot(input);
    const serializedPayload = stableStringify(canonicalPayload);
    const digest = node_crypto_1.default.createHash('sha256').update(serializedPayload).digest('hex');
    return `posting_${digest}`;
}
function snapshotForKey(input) {
    assertRequiredFields(input);
    if (input.receiptHash) {
        return stableStringify({ ruleVersion: input.ruleVersion, receiptHash: input.receiptHash });
    }
    return stableStringify(buildCanonicalSnapshot(input));
}
