import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import yaml from 'js-yaml';

export interface ExperimentConfig {
  id: string;
  description: string;
  hypothesis: string[];
  variant_split: Record<string, number>;
  metrics: {
    success: string[];
    guardrails: string[];
  };
}

/**
 * Manages A/B tests and feature experiments.
 * Handles configuration loading, deterministic variant assignment, and exposure logging.
 */
export class ExperimentManager {
  private experiments: ExperimentConfig[] = [];
  private logPath: string;

  /**
   * Initializes the ExperimentManager.
   *
   * @param configPath - Path to the YAML experiment configuration file.
   * @param logFile - Path to the exposure log file.
   */
  constructor(
    private configPath = path.join(process.cwd(), 'config', 'experiments.yaml'),
    logFile = path.join(process.cwd(), 'experiment-exposures.log'),
  ) {
    this.logPath = logFile;
    this.loadConfig();
  }

  private loadConfig() {
    const file = fs.readFileSync(this.configPath, 'utf8');
    const parsed = yaml.load(file) as { experiments: ExperimentConfig[] };
    this.experiments = parsed.experiments || [];
  }

  /**
   * Deterministically assigns a user to an experiment variant.
   * Uses a consistent hash of the experiment ID and user ID.
   *
   * @param experimentId - The ID of the experiment.
   * @param userId - The ID of the user.
   * @returns The assigned variant name, or null if the experiment is not found.
   */
  getVariant(experimentId: string, userId: string): string | null {
    const exp = this.experiments.find((e) => e.id === experimentId);
    if (!exp) return null;
    const hash = crypto
      .createHash('sha256')
      .update(`${experimentId}:${userId}`)
      .digest('hex');
    const num = parseInt(hash.slice(0, 8), 16) % 100;
    let cumulative = 0;
    for (const [variant, weight] of Object.entries(exp.variant_split)) {
      cumulative += weight;
      if (num < cumulative) return variant;
    }
    return null;
  }

  /**
   * Logs an exposure event for an experiment.
   * Records the assignment and any immediate metrics.
   *
   * @param experimentId - The experiment ID.
   * @param userId - The user ID.
   * @param variant - The assigned variant.
   * @param metrics - Key-value pairs of relevant metrics at exposure time.
   */
  logExposure(
    experimentId: string,
    userId: string,
    variant: string,
    metrics: Record<string, number>,
  ) {
    const entry = {
      ts: new Date().toISOString(),
      experimentId,
      userId,
      variant,
      metrics,
    };
    fs.appendFileSync(this.logPath, `${JSON.stringify(entry)}\n`);
  }
}
