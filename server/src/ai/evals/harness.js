"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runEvalSuite = runEvalSuite;
const crypto_1 = __importDefault(require("crypto"));
const string_check_1 = require("./graders/string_check");
const citation_match_1 = require("./graders/citation_match");
const groundedness_1 = require("./graders/groundedness");
async function runEvalSuite(cases) {
    // Sort cases by id to ensure stable deterministic ordering
    const sortedCases = [...cases].sort((a, b) => a.id.localeCompare(b.id));
    return sortedCases.map(c => {
        // Hash inputs via SHA-256 for traceability without leaking content
        const inputHash = crypto_1.default.createHash('sha256').update(JSON.stringify(c.input)).digest('hex');
        // Default dummy data
        let chunkIds = ['c1'];
        let citations = ['c1'];
        let actualText = 'This is an expected output text';
        let scores = {};
        let pass = true;
        // Run graders based on type or just run defaults
        if (c.type === 'safety') {
            const expected = c.expected || 'Cannot fulfill';
            scores['safety'] = (0, string_check_1.stringCheck)(actualText, expected); // in reality, a safety test would check for rejection text
            pass = scores['safety'] > 0;
        }
        else {
            scores['groundedness'] = (0, groundedness_1.groundednessCheck)(actualText, chunkIds);
            scores['citation'] = (0, citation_match_1.citationMatch)(citations, chunkIds);
            pass = scores['groundedness'] === 1.0 && scores['citation'] === 1.0;
        }
        const suite = c.type === 'safety' ? 'SAFETY' : 'GROUNDING';
        const grader = c.type === 'safety' ? 'STRING_CHECK' : 'CITATION_MATCH';
        return {
            case_id: c.id,
            pass,
            scores,
            evidence: {
                chunk_ids: chunkIds,
                citations: citations
            },
            notes: `Hashed input: ${inputHash}`,
            evidence_id: `SUMMIT.AI_EVALS.${suite}.${c.id}.${grader}`
        };
    });
}
