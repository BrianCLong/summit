
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Define interfaces for the health model and metrics
interface HealthFactor {
  name: string;
  weight: number;
  thresholds: Array<{
    level: string;
    gte?: number;
    lte?: number;
    gt?: number;
    lt?: number;
  }>;
}

interface HealthModel {
  factors: HealthFactor[];
}

interface Metrics {
  [key: string]: number;
}

// Function to calculate the score for a single factor
function calculateFactorScore(factor: HealthFactor, value: number): number {
  for (const threshold of factor.thresholds) {
    if (threshold.level === 'green') {
      if ((threshold.gte !== undefined && value >= threshold.gte) || (threshold.lte !== undefined && value <= threshold.lte)) {
        return 100;
      }
    } else if (threshold.level === 'yellow') {
      if ((threshold.gte !== undefined && value >= threshold.gte) || (threshold.lte !== undefined && value <= threshold.lte)) {
        return 50;
      }
    } else if (threshold.level === 'red') {
      if ((threshold.gt !== undefined && value > threshold.gt) || (threshold.lt !== undefined && value < threshold.lt)) {
        return 0;
      }
    }
  }
  return 0; // Default to 0 if no threshold is met
}

// Main function to compute the health score
function computeHealthScore(model: HealthModel, metrics: Metrics): any {
  let totalScore = 0;
  const factorScores: { [key: string]: { score: number; value: number } } = {};

  for (const factor of model.factors) {
    const metricValue = metrics[factor.name];
    if (metricValue !== undefined) {
      const score = calculateFactorScore(factor, metricValue);
      factorScores[factor.name] = { score, value: metricValue };
      totalScore += score * factor.weight;
    }
  }

  return {
    totalScore,
    factorScores,
  };
}

// Script entry point
function main() {
  const [modelPath, metricsPath, tenantId] = process.argv.slice(2);

  if (!modelPath || !metricsPath || !tenantId) {
    console.error(`Usage: ts-node compute_health_score.ts <model-path> <metrics-path> <tenant-id>`);
    process.exit(1);
  }

  if (!fs.existsSync(modelPath) || !fs.existsSync(metricsPath)) {
    console.error('Health model or metrics file not found.');
    process.exit(1);
  }

  const model: HealthModel = yaml.load(fs.readFileSync(modelPath, 'utf-8')) as HealthModel;
  const metrics: Metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));

  const healthData = computeHealthScore(model, metrics);

  const date = new Date().toISOString().split('T')[0];
  const outputDir = path.join('artifacts/cs', tenantId, date);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'health.json'), JSON.stringify(healthData, null, 2));
  fs.writeFileSync(path.join(outputDir, 'stamp.json'), JSON.stringify({ timestamp: new Date().toISOString() }, null, 2));

  console.log(`Health score for ${tenantId} on ${date} is ${healthData.totalScore}`);
  console.log(`Output written to ${outputDir}`);
}

main();
