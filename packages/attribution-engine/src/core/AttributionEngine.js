"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttributionEngine = void 0;
const EmailAnalyzer_js_1 = require("../analyzers/EmailAnalyzer.js");
const UsernameAnalyzer_js_1 = require("../analyzers/UsernameAnalyzer.js");
const PhoneAnalyzer_js_1 = require("../analyzers/PhoneAnalyzer.js");
class AttributionEngine {
    emailAnalyzer = new EmailAnalyzer_js_1.EmailAnalyzer();
    usernameAnalyzer = new UsernameAnalyzer_js_1.UsernameAnalyzer();
    phoneAnalyzer = new PhoneAnalyzer_js_1.PhoneAnalyzer();
    async attributeIdentity(identifier) {
        const footprint = await this.buildDigitalFootprint(identifier);
        const related = await this.findRelatedIdentifiers(footprint);
        return {
            primaryIdentity: identifier,
            identifiers: [identifier, ...Object.values(footprint.related).flat()],
            accounts: footprint.accounts,
            confidence: footprint.confidence,
            evidence: [`Found ${footprint.accounts.length} accounts`],
            digitalFootprint: footprint
        };
    }
    async buildDigitalFootprint(identifier) {
        const type = this.detectIdentifierType(identifier);
        return {
            identifier,
            type,
            accounts: [],
            related: {},
            confidence: 0.7
        };
    }
    detectIdentifierType(id) {
        if (id.includes('@'))
            return 'email';
        if (/^\+?\d{10,}$/.test(id))
            return 'phone';
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(id))
            return 'ip';
        if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(id))
            return 'crypto';
        return 'username';
    }
    async findRelatedIdentifiers(footprint) {
        return [];
    }
}
exports.AttributionEngine = AttributionEngine;
