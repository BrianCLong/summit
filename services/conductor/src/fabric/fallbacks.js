"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.regexFallback = regexFallback;
exports.cannedPlaybookFallback = cannedPlaybookFallback;
function regexFallback() {
    return {
        strategy: 'regex-parser',
        notes: [
            'Using deterministic regex parser for SARIF and JUnit extraction',
            'LLM path bypassed due to safety or cost constraint',
        ],
    };
}
function cannedPlaybookFallback(playbook) {
    return {
        strategy: 'canned-playbook',
        notes: [
            `Applied playbook ${playbook}`,
            'Provenance maintained via signed runbook entry',
        ],
    };
}
