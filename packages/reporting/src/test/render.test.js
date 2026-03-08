"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const render_js_1 = require("../render.js");
(0, node_test_1.default)("renderReport is deterministic and claim-bound", () => {
    const report = (0, render_js_1.renderReport)({
        case_id: "case-1",
        claims: [
            { claim_cid: "cid-2", evidence_cids: ["e2"], verified: true },
            { claim_cid: "cid-1", evidence_cids: ["e1"], verified: true }
        ],
        sections: [{
                title: "Findings",
                statement_claims: [{ text: "Statement A", claim_cids: ["cid-1", "cid-2"] }]
            }]
    });
    strict_1.default.deepEqual(report.claims_used, ["cid-1", "cid-2"]);
    strict_1.default.deepEqual(report.evidence_cids, ["e1", "e2"]);
});
(0, node_test_1.default)("renderReport rejects unverified claims", () => {
    strict_1.default.throws(() => (0, render_js_1.renderReport)({
        case_id: "case-1",
        claims: [{ claim_cid: "cid-1", evidence_cids: ["e1"], verified: true }],
        sections: [{ title: "Findings", statement_claims: [{ text: "X", claim_cids: ["cid-2"] }] }]
    }), /UNVERIFIED_CLAIM_REFERENCED/);
});
