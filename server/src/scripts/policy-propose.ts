#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { program } from 'commander';
import { ProposalEngine, DenyRateRule, BurstRule } from '../policy-engine/engine.js';
import { PolicyChangeProposal, SecurityEvidence } from '../policy-engine/proposal-types.js';
import * as yaml from 'js-yaml';

// Ensure output directory exists
const PROPOSALS_DIR = path.join(process.cwd(), '.security/proposals');
if (!fs.existsSync(PROPOSALS_DIR)) {
  fs.mkdirSync(PROPOSALS_DIR, { recursive: true });
}

// Setup Engine
const engine = new ProposalEngine();
engine.registerRule(new DenyRateRule());
engine.registerRule(new BurstRule());
// Add new rules
import { ToolMixRule, RedactionRule } from '../policy-engine/engine.js';
engine.registerRule(new ToolMixRule());
engine.registerRule(new RedactionRule());

program
  .name('policy-propose')
  .description('Summit Policy Auto-Tuning Proposal CLI')
  .option('-i, --input <path>', 'Path to JSON file containing SecurityEvidence[]')
  .option('-o, --out <path>', 'Output directory for proposals', PROPOSALS_DIR)
  .action(async (options) => {
    try {
      const inputPath = path.resolve(options.input);
      if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        process.exit(1);
      }

      const evidenceRaw = fs.readFileSync(inputPath, 'utf8');
      const evidenceList: SecurityEvidence[] = JSON.parse(evidenceRaw);

      console.log(`Loaded ${evidenceList.length} evidence items.`);

      const outDir = path.resolve(options.out);
      if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
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

    } catch (error) {
      console.error('Error generating proposals:', error);
      process.exit(1);
    }
  });

async function saveProposal(proposal: PolicyChangeProposal, outDir: string) {
  const proposalDir = path.join(outDir, proposal.id);
  if (!fs.existsSync(proposalDir)) {
    fs.mkdirSync(proposalDir, { recursive: true });
  }

  // 1. proposal.json
  fs.writeFileSync(
    path.join(proposalDir, 'proposal.json'),
    JSON.stringify(proposal, null, 2)
  );

  // 2. patch.diff (Mocked for now - in real life, would load original file and compute diff)
  const diffContent = generateMockDiff(proposal);
  fs.writeFileSync(path.join(proposalDir, 'patch.diff'), diffContent);

  // 3. VERIFY.md
  const verifyContent = `# Verification Plan for ${proposal.id}

Rationale: ${proposal.rationale}

## Commands
${proposal.verification.commands.map(c => `\`${c}\``).join('\n')}

## Expected Signals
${proposal.verification.expectedSignals.map(s => `- ${s}`).join('\n')}
`;
  fs.writeFileSync(path.join(proposalDir, 'VERIFY.md'), verifyContent);

  // 4. ROLLBACK.md
  const rollbackContent = `# Rollback Plan for ${proposal.id}

## Steps
${proposal.riskAssessment.rollbackSteps.map(s => `- ${s}`).join('\n')}
`;
  fs.writeFileSync(path.join(proposalDir, 'ROLLBACK.md'), rollbackContent);
}

function generateMockDiff(proposal: PolicyChangeProposal): string {
    // Attempt to generate a pseudo-unified diff
    return proposal.proposedChanges.map(change => {
        const header = `diff --git a/${change.target} b/${change.target}\n--- a/${change.target}\n+++ b/${change.target}\n`;

        let chunk = '';

        // Generate a plausible Unified Diff hunk
        // For 'add', we simulate appending to end of file if we can't find context.
        // For 'replace', we simulate a change.

        const valueStr = JSON.stringify(change.value, null, 2).split('\n').join('\n+ ');

        if (change.operation === 'add') {
             chunk = `@@ -1,1 +1,10 @@\n  ...\n+ # Added by Policy Auto-Tuning\n+ ${valueStr}\n`;
        } else if (change.operation === 'replace') {
             chunk = `@@ -10,5 +10,5 @@\n- ${JSON.stringify(change.originalValue)}\n+ ${valueStr}\n`;
        } else {
             chunk = `@@ -1,1 +1,1 @@\n- ${valueStr}\n`;
        }

        return header + chunk;
    }).join('\n');
}

program.parse(process.argv);
