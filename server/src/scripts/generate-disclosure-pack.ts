// server/src/scripts/generate-disclosure-pack.ts
import fs from 'fs/promises';
import path from 'path';
import { DecisionAnalysisPipeline, DecisionAnalysisInput } from '../maestro/pipelines/decision-analysis-pipeline';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates a markdown disclosure pack from a decision analysis result.
 * @param result - The result from the DecisionAnalysisPipeline.
 * @returns A string containing the markdown report.
 */
function generateMarkdown(result: import('../maestro/pipelines/decision-analysis-pipeline').DecisionAnalysisResult): string {
  const { decision, referencedClaims, artifacts } = result;

  let md = `# Disclosure Pack: Decision Analysis\n\n`;
  md += `**Decision ID:** \`${decision.id}\`\n`;
  md += `**Date:** ${new Date(decision.createdAt).toUTCString()}\n\n`;

  md += `## 1. Decision Summary\n\n`;
  md += `### Question\n`;
  md += `> ${decision.question}\n\n`;
  md += `### Recommendation\n`;
  md += `**${decision.recommendation}**\n\n`;
  md += `### Rationale\n`;
  md += `${decision.rationale}\n\n`;

  md += `## 2. Referenced Claims & Evidence\n\n`;
  md += `This decision was informed by the following claims:\n\n`;

  if (referencedClaims.length === 0) {
    md += `- No claims were referenced.\n`;
  } else {
    md += `| Claim ID | Statement |\n`;
    md += `|----------|-----------|\n`;
    for (const claim of referencedClaims) {
      md += `| \`${claim.id}\` | ${claim.statement.replace(/\n/g, ' ')} |\n`;
    }
  }
  md += `\n*Note: Evidence and source links are not yet included in this version of the disclosure pack.*\n\n`;


  md += `## 3. Known Limitations & Risks\n\n`;
  md += `- **Automated Analysis:** This report was generated based on an automated analysis. It is a starting point for human review, not a replacement for it.\n`;
  md += `- **Incomplete Data:** The analysis is limited to the claims and entities provided. There may be external factors not considered.\n`;
  md += `- **Model Reliability:** The recommendation is based on a mock model service and does not reflect a true AI-driven analysis in this version.\n\n`;

  md += `## 4. Run Metadata\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Latency | ${artifacts.cost_and_latency.latency_ms} ms |\n`;
  md += `| Cost Units | ${artifacts.cost_and_latency.cost_units} |\n`;

  return md;
}

/**
 * Main function to run a pipeline and generate a disclosure pack.
 */
async function main() {
  console.log('Starting Decision Analysis Pipeline to generate artifacts...');

  // Mock input for the pipeline
  const mockInput: DecisionAnalysisInput = {
    tenantId: 'tenant-disclosure-demo',
    ownerId: 'user-disclosure-demo',
    question: 'Should we approve the procurement of Vendor B for Project X?',
    intelGraphEntityIds: ['mock-entity-1', 'mock-entity-2'], // These would be real UUIDs
    constraints: ['Decision required by EOD.', 'Budget must not exceed $50,000.'],
  };

  // In a real scenario, we might need to mock the IntelGraphService for the script
  // but since our getEntityClaims is simple, we'll let it run. It will likely find nothing,
  // which is a good test case.
  const pipeline = new DecisionAnalysisPipeline();
  const result = await pipeline.execute(mockInput);

  console.log('Pipeline execution complete. Generating markdown...');

  const markdownContent = generateMarkdown(result);
  const outputPath = path.join(__dirname, `../../../artifacts/disclosure_pack_${result.decision.id}.md`);

  // Ensure the artifacts directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, markdownContent);

  console.log(`\nSuccessfully generated disclosure pack!`);
  console.log(`>> Output written to: ${outputPath}`);
}

main().catch(error => {
  console.error('Failed to generate disclosure pack:', error);
  process.exit(1);
});
