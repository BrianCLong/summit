"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineageTracker = void 0;
const canonicalizer_js_1 = require("../canonical/canonicalizer.js");
const eventLog_js_1 = require("../eventlog/eventLog.js");
class LineageTracker {
    options;
    ledger;
    constructor(options = {}) {
        this.options = options;
        this.ledger = new eventLog_js_1.EventLog({ signer: options.signer });
    }
    ingress(payload, context) {
        const checksum = (0, canonicalizer_js_1.stableHash)(payload);
        const observedAt = context.observedAt ?? new Date().toISOString();
        const provenance = {
            source: context.source,
            ingress: context.ingress,
            observedAt,
            traceId: context.traceId,
            runId: context.runId,
            checksum,
            chain: context.parentChecksums ?? [],
            attributes: context.attributes,
            signature: this.options.signer ? this.options.signer(checksum) : undefined,
        };
        this.ledger.append({
            id: `${context.source}:${checksum}`,
            type: 'lineage.ingress',
            scope: context.source,
            actor: context.ingress,
            timestamp: observedAt,
            payload: provenance,
        });
        return { payload, provenance };
    }
    propagate(envelope, hop) {
        const checksum = (0, canonicalizer_js_1.stableHash)(envelope.payload);
        const observedAt = hop.observedAt ?? new Date().toISOString();
        const chain = [...(envelope.provenance.chain ?? []), envelope.provenance.checksum];
        const attributes = { ...envelope.provenance.attributes, ...hop.attributes };
        const provenance = {
            ...envelope.provenance,
            source: hop.source ?? envelope.provenance.source,
            ingress: hop.ingress ?? envelope.provenance.ingress,
            observedAt,
            checksum,
            chain,
            attributes,
            signature: this.options.signer ? this.options.signer(checksum) : envelope.provenance.signature,
        };
        this.ledger.append({
            id: `${provenance.source}:${checksum}`,
            type: 'lineage.hop',
            scope: provenance.source,
            actor: provenance.ingress,
            timestamp: observedAt,
            payload: provenance,
        });
        return { payload: envelope.payload, provenance };
    }
    asHeaders(envelope) {
        const { provenance } = envelope;
        const headers = {
            'x-lineage-source': provenance.source,
            'x-lineage-ingress': provenance.ingress,
            'x-lineage-observed-at': provenance.observedAt,
            'x-lineage-checksum': provenance.checksum,
        };
        if (provenance.traceId)
            headers['x-trace-id'] = provenance.traceId;
        if (provenance.runId)
            headers['x-run-id'] = provenance.runId;
        if (provenance.signature)
            headers['x-lineage-signature'] = provenance.signature;
        if (provenance.chain?.length)
            headers['x-lineage-chain'] = provenance.chain.join(',');
        if (provenance.attributes) {
            headers['x-lineage-attributes'] = JSON.stringify(provenance.attributes);
        }
        return headers;
    }
    fromHeaders(payload, headers) {
        const observedAt = headers['x-lineage-observed-at'] ?? new Date().toISOString();
        const checksum = headers['x-lineage-checksum'] ?? (0, canonicalizer_js_1.stableHash)(payload);
        const chain = headers['x-lineage-chain']?.split(',').filter(Boolean) ?? [];
        const attributes = headers['x-lineage-attributes']
            ? JSON.parse(headers['x-lineage-attributes'])
            : undefined;
        const provenance = {
            source: headers['x-lineage-source'] ?? 'unknown',
            ingress: headers['x-lineage-ingress'] ?? 'api',
            observedAt,
            traceId: headers['x-trace-id'],
            runId: headers['x-run-id'],
            checksum,
            chain,
            attributes,
            signature: headers['x-lineage-signature'],
        };
        return { payload, provenance };
    }
    validate(envelope, expectations = {}) {
        const expectedChecksum = (0, canonicalizer_js_1.stableHash)(envelope.payload);
        const hashMatches = expectedChecksum === envelope.provenance.checksum;
        const sourceMatches = expectations.source
            ? envelope.provenance.source === expectations.source
            : true;
        const ingressMatches = expectations.ingress
            ? envelope.provenance.ingress === expectations.ingress
            : true;
        const chainDepth = envelope.provenance.chain?.length ?? 0;
        const valid = hashMatches && sourceMatches && ingressMatches;
        return {
            valid,
            hashMatches,
            sourceMatches,
            ingressMatches,
            chainDepth,
            signaturePresent: Boolean(envelope.provenance.signature),
        };
    }
    ledgerEntries() {
        return this.ledger.list(0, 1000);
    }
}
exports.LineageTracker = LineageTracker;
