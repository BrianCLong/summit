"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MispClient = exports.TaxiiCollectionClient = exports.StixBundleAdapter = void 0;
function parsePattern(pattern) {
    const normalized = pattern.toLowerCase();
    if (normalized.includes('ipv4-addr')) {
        const match = /\'([0-9.]+)\'/.exec(pattern);
        if (match) {
            return { type: 'ip', value: match[1] };
        }
    }
    if (normalized.includes('domain-name')) {
        const match = /\'([^']+)\'/.exec(pattern);
        if (match) {
            return { type: 'domain', value: match[1] };
        }
    }
    if (normalized.includes('file:hashes')) {
        const match = /\'([0-9a-f]{16,})\'/.exec(pattern);
        if (match) {
            return { type: 'hash', value: match[1] };
        }
    }
    return undefined;
}
class StixBundleAdapter {
    fetchBundle;
    name = 'stix-adapter';
    constructor(fetchBundle) {
        this.fetchBundle = fetchBundle;
    }
    async fetchIndicators() {
        const bundle = await this.fetchBundle();
        const indicators = [];
        for (const object of bundle.objects ?? []) {
            if (object.type !== 'indicator' || !object.pattern) {
                continue;
            }
            const parsed = parsePattern(object.pattern);
            if (!parsed) {
                continue;
            }
            indicators.push({
                id: object.id,
                value: parsed.value,
                type: parsed.type,
                confidence: object.confidence ?? 50,
                source: 'STIX',
                validUntil: object.valid_until,
                tags: object.labels,
            });
        }
        return indicators;
    }
}
exports.StixBundleAdapter = StixBundleAdapter;
class TaxiiCollectionClient {
    fetchCollection;
    name;
    constructor(name, fetchCollection) {
        this.fetchCollection = fetchCollection;
        this.name = name;
    }
    async fetchIndicators() {
        const indicators = await this.fetchCollection();
        return indicators.map((indicator) => ({ ...indicator, source: 'TAXII' }));
    }
}
exports.TaxiiCollectionClient = TaxiiCollectionClient;
class MispClient {
    fetchFeed;
    name = 'misp-client';
    constructor(fetchFeed) {
        this.fetchFeed = fetchFeed;
    }
    async fetchIndicators() {
        const indicators = await this.fetchFeed();
        return indicators.map((indicator) => ({ ...indicator, source: 'MISP' }));
    }
}
exports.MispClient = MispClient;
