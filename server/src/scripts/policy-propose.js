#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const commander_1 = require("commander");
const engine_js_1 = require("../policy-engine/engine.js");
// Ensure output directory exists
const PROPOSALS_DIR = path_1.default.join(process.cwd(), '.security/proposals');
if (!fs_1.default.existsSync(PROPOSALS_DIR)) {
    fs_1.default.mkdirSync(PROPOSALS_DIR, { recursive: true });
}
// Setup Engine
const engine = new engine_js_1.ProposalEngine();
engine.registerRule(new engine_js_1.DenyRateRule());
engine.registerRule(new engine_js_1.BurstRule());
// Add new rules
const engine_js_2 = require("../policy-engine/engine.js");
engine.registerRule(new engine_js_2.ToolMixRule());
engine.registerRule(new engine_js_2.RedactionRule());
commander_1.program
    .name('policy-propose')
    .description('Summit Policy Auto-Tuning Proposal CLI')
    .option('-i, --input <path>', 'Path to JSON file containing SecurityEvidence[]')
    .option('-o, --out <path>', 'Output directory for proposals', PROPOSALS_DIR)
    .action(async (options) => {
    try {
        const inputPath = path_1.default.resolve(options.input);
        if (!fs_1.default.existsSync(inputPath)) {
            console.error(`Input file not found: ${inputPath}`);
            process.exit(1);
        }
        const evidenceRaw = fs_1.default.readFileSync(inputPath, 'utf8');
        const evidenceList = JSON.parse(evidenceRaw);
        console.log(`Loaded ${evidenceList.length} evidence items.`);
        const outDir = path_1.default.resolve(options.out);
        if (!fs_1.default.existsSync(outDir)) {
            fs_1.default.mkdirSync(outDir, { recursive: true });
        }
        let generatedCount = 0;
        for (const ev of evidenceList) {
            const proposal = engine.generateProposal(ev);
            if (proposal) {
                await saveProposal(proposal, outDir);
                generatedCount++;
            }
        }
        console.log(`Generated ${generatedCount} proposals in ${outDir}`);
    }
    catch (error) {
        console.error('Error generating proposals:', error);
        process.exit(1);
    }
});
async function saveProposal(proposal, outDir) {
    const proposalDir = path_1.default.join(outDir, proposal.id);
    if (!fs_1.default.existsSync(proposalDir)) {
        fs_1.default.mkdirSync(proposalDir, { recursive: true });
    }
    // 1. proposal.json
    fs_1.default.writeFileSync(path_1.default.join(proposalDir, 'proposal.json'), JSON.stringify(proposal, null, 2));
    // 2. patch.diff (Mocked for now - in real life, would load original file and compute diff)
    const diffContent = generateMockDiff(proposal);
    fs_1.default.writeFileSync(path_1.default.join(proposalDir, 'patch.diff'), diffContent);
    // 3. VERIFY.md
    const verifyContent = `# Verification Plan for ${proposal.id}

Rationale: ${proposal.rationale}

## Commands
${proposal.verification.commands.map((c) => `\`${c}\``).join('\n')}

## Expected Signals
${proposal.verification.expectedSignals.map((s) => `- ${s}`).join('\n')}
`;
    fs_1.default.writeFileSync(path_1.default.join(proposalDir, 'VERIFY.md'), verifyContent);
    // 4. ROLLBACK.md
    const rollbackContent = `# Rollback Plan for ${proposal.id}

## Steps
${proposal.riskAssessment.rollbackSteps.map((s) => `- ${s}`).join('\n')}
`;
    fs_1.default.writeFileSync(path_1.default.join(proposalDir, 'ROLLBACK.md'), rollbackContent);
}
function generateMockDiff(proposal) {
    // Attempt to generate a pseudo-unified diff
    return proposal.proposedChanges.map((change) => {
        const header = `diff --git a/${change.target} b/${change.target}\n--- a/${change.target}\n+++ b/${change.target}\n`;
        let chunk = '';
        // Generate a plausible Unified Diff hunk
        // For 'add', we simulate appending to end of file if we can't find context.
        // For 'replace', we simulate a change.
        const valueStr = JSON.stringify(change.value, null, 2).split('\n').join('\n+ ');
        if (change.operation === 'add') {
            chunk = `@@ -1,1 +1,10 @@\n  ...\n+ # Added by Policy Auto-Tuning\n+ ${valueStr}\n`;
        }
        else if (change.operation === 'replace') {
            chunk = `@@ -10,5 +10,5 @@\n- ${JSON.stringify(change.originalValue)}\n+ ${valueStr}\n`;
        }
        else {
            chunk = `@@ -1,1 +1,1 @@\n- ${valueStr}\n`;
        }
        return header + chunk;
    }).join('\n');
}
commander_1.program.parse(process.argv);
