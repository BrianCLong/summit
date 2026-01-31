import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

/**
 * Generates a high-level executive summary from the assurance graph.
 */
export async function generateExecutiveSummary(): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const graphPath = resolve(__dirname, `../../artifacts/assurance-graph/${date}/graph.json`);
  const graph = JSON.parse(readFileSync(graphPath, 'utf-8'));

  const summary = {
    total_repos: graph.entities.filter((e) => e.type === 'Repo').length,
    total_releases: graph.entities.filter((e) => e.type === 'Release').length,
    total_artifacts: graph.entities.filter((e) => e.type === 'Artifact').length,
    total_controls: graph.entities.filter((e) => e.type === 'Control').length,
    total_exceptions: graph.entities.filter((e) => e.type === 'Exception').length,
    total_incidents: graph.entities.filter((e) => e.type === 'Incident').length,
    total_slos: graph.entities.filter((e) => e.type === 'SLO').length,
    total_customers: graph.entities.filter((e) => e.type === 'Customer').length,
    total_deployments: graph.entities.filter((e) => e.type === 'Deployment').length,
  };

  const reportDir = resolve(__dirname, `../../artifacts/reporting/${date}`);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(resolve(reportDir, 'executive-summary.json'), JSON.stringify(summary, null, 2));
}

// Example usage:
if (require.main === module) {
  (async () => {
    try {
      await generateExecutiveSummary();
      console.log('Executive summary generated successfully.');
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  })();
}
