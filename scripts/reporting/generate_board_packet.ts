import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

/**
 * Generates a comprehensive "board packet" from the assurance graph.
 */
export async function generateBoardPacket(): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const graphPath = resolve(__dirname, `../../artifacts/assurance-graph/${date}/graph.json`);
  const graph = JSON.parse(readFileSync(graphPath, 'utf-8'));

  const executiveSummaryPath = resolve(__dirname, `../../artifacts/reporting/${date}/executive-summary.json`);
  const executiveSummary = JSON.parse(readFileSync(executiveSummaryPath, 'utf-8'));

  const driftAnomalyReportPath = resolve(
    __dirname,
    `../../artifacts/assurance/drift-anomalies/${date}/report.json`
  );
  const driftAnomalyReport = JSON.parse(readFileSync(driftAnomalyReportPath, 'utf-8'));

  const boardPacket = {
    executive_summary: executiveSummary,
    drift_anomalies: driftAnomalyReport,
    assurance_graph: graph,
  };

  const reportDir = resolve(__dirname, `../../artifacts/reporting/${date}`);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(resolve(reportDir, 'board-packet.json'), JSON.stringify(boardPacket, null, 2));
}

// Example usage:
if (require.main === module) {
  (async () => {
    try {
      await generateBoardPacket();
      console.log('Board packet generated successfully.');
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  })();
}
