"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestLrtRun = void 0;
const node_crypto_1 = require("node:crypto");
const promptCategoryByFinding = (finding) => {
    if (finding.tool) {
        return 'tool-abuse';
    }
    if (finding.jailbreak) {
        return 'jailbreak-pattern';
    }
    return 'attack-prompt';
};
const ingestLrtRun = (run) => {
    return run.findings.map((finding, index) => {
        const category = promptCategoryByFinding(finding);
        const metadata = {
            run_id: run.id,
            run_name: run.name,
            operator: run.operator,
            sequence: index,
            response_summary: finding.response_summary,
            notes: finding.notes,
            jailbreak_pattern: finding.jailbreak,
            tool: finding.tool
        };
        return {
            id: (0, node_crypto_1.randomUUID)(),
            category,
            title: category === 'tool-abuse'
                ? `${finding.tool ?? 'tool'} abuse signature`
                : category === 'jailbreak-pattern'
                    ? 'LLM jailbreak pattern'
                    : 'LLM attack prompt',
            description: finding.prompt,
            llm_family: finding.llm_family,
            severity: finding.severity,
            observed_at: finding.observed_at,
            metadata
        };
    });
};
exports.ingestLrtRun = ingestLrtRun;
