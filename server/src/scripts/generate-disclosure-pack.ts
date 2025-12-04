// server/src/scripts/generate-disclosure-pack.ts
import fs from 'fs/promises';
import path from 'path';
import { DecisionAnalysisPipeline, DecisionAnalysisInput, DecisionAnalysisResult } from '../maestro/pipelines/decision-analysis-pipeline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateMarkdown(result: DecisionAnalysisResult): string {
  const { decision, referencedClaims, artifacts } = result;

  let md = `# Disclosure Pack: Decision Analysis\n\n`;
  md += `**Decision ID:** \`${decision.id}\`  \n`;
  md += `**Date:** ${new Date(decision.createdAt).toUTCString()}\n\n`;

  md += `## 1. Decision Summary\n`;
  md += `### Question\n> ${decision.question}\n\n`;
  md += `### Recommendation\n**${decision.recommendation}**\n\n`;
  md += `### Rationale\n${decision.rationale}\n\n`;

  md += `## 2. Referenced Claims & Evidence\nThis decision was informed by the following claims:\n\n`;
  if (referencedClaims.length === 0) {
    md += `- No claims were referenced.\n`;
  } else {
    md += `| Claim ID | Statement |\n|---|---|\n`;
    referencedClaims.forEach(claim => {
      md += `| \`${claim.id}\` | ${claim.statement.replace(/\n/g, ' ')} |\n`;
    });
  }
  md += `\n*Note: A future version will include direct links to evidence.*\n\n`;

  md += `## 3. Known Limitations & Risks\n`;
  md += `- **Automated Analysis:** This report is a starting point for human review, not a replacement.\n`;
  md += `- **Incomplete Data:** Analysis is limited to the provided entities.\n`;
  md += `- **Model Reliability:** The recommendation is based on the configured model provider.\n\n`;

  md += `## 4. Run Metadata\n| Metric | Value |\n|---|---|\n`;
  md += `| Latency | ${artifacts.cost_and_latency.latency_ms} ms |\n`;
  md += `| Cost Units | ${artifacts.cost_and_latency.cost_units} |\n`;

  return md;
}

function generateHTML(result: DecisionAnalysisResult): string {
    const { decision, referencedClaims, artifacts } = result;
    const claimsRows = referencedClaims.length === 0
        ? '<tr><td colspan="2">No claims were referenced.</td></tr>'
        : referencedClaims.map(claim => `<tr><td><code>${claim.id}</code></td><td>${claim.statement}</td></tr>`).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Disclosure Pack: Decision ${decision.id}</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #111; }
        code { background-color: #eee; padding: 2px 4px; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        blockquote { border-left: 4px solid #ccc; padding-left: 16px; color: #666; }
    </style>
</head>
<body>
    <h1>Disclosure Pack: Decision Analysis</h1>
    <p><strong>Decision ID:</strong> <code>${decision.id}</code></p>
    <p><strong>Date:</strong> ${new Date(decision.createdAt).toUTCString()}</p>

    <h2>1. Decision Summary</h2>
    <h3>Question</h3>
    <blockquote>${decision.question}</blockquote>
    <h3>Recommendation</h3>
    <p><strong>${decision.recommendation}</strong></p>
    <h3>Rationale</h3>
    <p>${decision.rationale}</p>

    <h2>2. Referenced Claims & Evidence</h2>
    <p>This decision was informed by the following claims:</p>
    <table>
        <thead><tr><th>Claim ID</th><th>Statement</th></tr></thead>
        <tbody>${claimsRows}</tbody>
    </table>
    <p><small><em>Note: A future version will include direct links to evidence.</em></small></p>

    <h2>3. Known Limitations & Risks</h2>
    <ul>
        <li><strong>Automated Analysis:</strong> This report is a starting point for human review, not a replacement.</li>
        <li><strong>Incomplete Data:</strong> Analysis is limited to the provided entities.</li>
        <li><strong>Model Reliability:</strong> The recommendation is based on the configured model provider.</li>
    </ul>

    <h2>4. Run Metadata</h2>
    <table>
        <thead><tr><th>Metric</th><th>Value</th></tr></thead>
        <tbody>
            <tr><td>Latency</td><td>${artifacts.cost_and_latency.latency_ms} ms</td></tr>
            <tr><td>Cost Units</td><td>${artifacts.cost_and_latency.cost_units}</td></tr>
        </tbody>
    </table>
</body>
</html>`;
}

async function main() {
  console.log('Starting Decision Analysis Pipeline to generate artifacts...');

  const mockInput: DecisionAnalysisInput = {
    tenantId: 'tenant-disclosure-demo',
    ownerId: 'user-disclosure-demo',
    question: 'Should we approve the procurement of Vendor B for Project X?',
    intelGraphEntityIds: [],
    constraints: ['Decision required by EOD.', 'Budget must not exceed $50,000.'],
  };

  const pipeline = new DecisionAnalysisPipeline();
  const result = await pipeline.execute(mockInput);

  console.log('Pipeline execution complete. Generating reports...');

  const markdownContent = generateMarkdown(result);
  const htmlContent = generateHTML(result);

  const mdOutputPath = path.join(__dirname, `../../../artifacts/disclosure_pack_${result.decision.id}.md`);
  const htmlOutputPath = path.join(__dirname, `../../../artifacts/disclosure_pack_${result.decision.id}.html`);

  await fs.mkdir(path.dirname(mdOutputPath), { recursive: true });
  await fs.writeFile(mdOutputPath, markdownContent);
  await fs.writeFile(htmlOutputPath, htmlContent);

  console.log(`\nSuccessfully generated reports!`);
  console.log(`>> MD Output: ${mdOutputPath}`);
  console.log(`>> HTML Output: ${htmlOutputPath}`);
}

main().catch(error => {
  console.error('Failed to generate disclosure pack:', error);
  process.exit(1);
});
