"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyTagger = void 0;
class PolicyTagger {
    defaults;
    constructor(defaults) {
        this.defaults = defaults;
    }
    tag(text, overrides) {
        const policy = {
            ...this.defaults,
            ...overrides,
        };
        const tags = new Set();
        tags.add(`purpose:${policy.purpose}`);
        tags.add(`retention:${policy.retention}`);
        if (policy.licenseClass === 'MIT-OK') {
            tags.add('license:mit-ok');
        }
        else {
            tags.add('license:restricted');
        }
        if (policy.pii) {
            tags.add('pii:present');
        }
        else {
            tags.add('pii:absent');
        }
        if (/export|external/i.test(text)) {
            tags.add('purpose:compliance');
        }
        if (/secret|credential/i.test(text)) {
            policy.safetyTier = 'high';
        }
        if (/eu-only/i.test(text)) {
            policy.residency = 'eu';
        }
        return { policy, tags: Array.from(tags) };
    }
}
exports.PolicyTagger = PolicyTagger;
