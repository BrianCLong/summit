"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeBundle = analyzeBundle;
const content_js_1 = require("./signals/content.js");
const provenance_js_1 = require("./signals/provenance.js");
const network_js_1 = require("./signals/network.js");
const playbooks_js_1 = require("./playbooks.js");
function sanitize(text) {
    return text.replace(/<[^>]*>/g, '');
}
async function analyzeBundle(bundle, evidenceId) {
    const sanitizedBundle = {
        ...bundle,
        items: (bundle.items || []).map((item) => {
            if (item.text) {
                return { ...item, text: sanitize(item.text) };
            }
            return item;
        })
    };
    const contentSignals = (0, content_js_1.analyzeContent)(sanitizedBundle);
    const provenanceSignals = (0, provenance_js_1.analyzeProvenance)(sanitizedBundle);
    const networkSignals = (0, network_js_1.analyzeNetwork)(sanitizedBundle);
    const riskScore = calculateRisk(contentSignals, provenanceSignals, networkSignals);
    const reportBase = {
        evidence_id: evidenceId,
        risk_score: riskScore,
        signals: {
            content: contentSignals,
            provenance: provenanceSignals,
            network: networkSignals
        }
    };
    const { mitigations, targetingGap } = (0, playbooks_js_1.generatePlaybook)(reportBase);
    return {
        ...reportBase,
        targeting_gap: targetingGap,
        mitigations: mitigations
    };
}
function calculateRisk(content, prov, net) {
    let score = 0;
    if (content.sensationalism_score > 0.5)
        score += 0.3;
    if (prov.has_missing_credentials)
        score += 0.4;
    if (net.coordinated_sharing_events > 0)
        score += 0.3;
    return Math.min(score, 1.0);
}
