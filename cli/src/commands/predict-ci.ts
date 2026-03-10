import chalk from 'chalk';
import { Command } from 'commander';
import { assessCiRisk } from '../lib/ci-risk.js';

function drawGauge(probability: number): string {
  const bars = 20;
  const filled = Math.round((probability / 100) * bars);
  return `[${'█'.repeat(filled)}${'░'.repeat(Math.max(0, bars - filled))}] ${probability}%`;
}

export function registerPredictCiCommand(program: Command): void {
  program
    .command('predict-ci')
    .description('Predict CI instability risk for a repository over the next 7-14 days')
    .argument('<repoPath>', 'Path to git repository to analyze')
    .option('--json', 'Output result as JSON', false)
    .action((repoPath, options: { json?: boolean }) => {
      const assessment = assessCiRisk(repoPath);

      if (options.json) {
        console.log(JSON.stringify(assessment, null, 2));
        return;
      }

      console.log(chalk.bold('\nCI Failure Risk Analysis'));
      console.log('------------------------');
      console.log(`Repository: ${assessment.repository}`);
      console.log(`Commits analyzed: ${assessment.commitsAnalyzed.toLocaleString()}`);
      console.log(`PRs analyzed: ${assessment.prsAnalyzed.toLocaleString()}`);
      console.log('');
      console.log(
        `Risk Score: ${assessment.riskScore.toFixed(2)} (${chalk.bold(assessment.riskLevel)})`,
      );
      console.log('');
      console.log('Key Drivers');
      console.log('-----------');
      assessment.drivers.forEach((driver) => {
        console.log(`• ${driver.label}: ${driver.value}`);
      });
      console.log('');
      console.log('Prediction');
      console.log('----------');
      console.log(
        `Probability of CI instability in next 14 days: ${assessment.instabilityProbability14d}%`,
      );
      if (assessment.highRiskCandidates.length > 0) {
        console.log('');
        console.log('Most likely trigger:');
        console.log(
          `${assessment.highRiskCandidates[0].id} touching ${assessment.highRiskCandidates[0].subsystemsTouched} subsystems`,
        );
      }

      console.log('');
      console.log(chalk.bold('Dashboard'));
      console.log('---------');
      console.log(`1) CI Failure Probability Gauge\n   ${drawGauge(assessment.instabilityProbability14d)}`);
      console.log(
        `2) Architecture Drift Timeline\n   cross-subsystem: ${assessment.crossSubsystemChangePercent}% | coupling: ${assessment.couplingIndex.toFixed(2)}`,
      );
      console.log(
        `3) Dependency Graph Heatmap\n   fan-in pressure delta: +${assessment.dependencyFanInPercent}%`,
      );
      console.log('4) High-Risk PR Candidates');
      if (assessment.highRiskCandidates.length === 0) {
        console.log('   none detected in current commit window');
      } else {
        assessment.highRiskCandidates.forEach((candidate) => {
          console.log(`   ${candidate.id} – modifies ${candidate.subsystemsTouched} subsystems`);
        });
      }
    });
}
