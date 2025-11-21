import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { TrainingExample } from '../training/TrainingPipeline.js';
import { logger } from '../utils/logger.js';
import {
  HyperparameterOptimizationRequest,
  HyperparameterOptimizationResult,
  HyperparameterSearchSpace,
} from './types.js';

const DEFAULT_SEARCH_SPACE: Record<string, HyperparameterSearchSpace> = {
  random_forest: {
    n_estimators: { type: 'int', min: 50, max: 400, step: 10 },
    max_depth: { type: 'int', min: 4, max: 32 },
    min_samples_split: { type: 'int', min: 2, max: 12 },
    min_samples_leaf: { type: 'int', min: 1, max: 6 },
  },
  gradient_boosting: {
    n_estimators: { type: 'int', min: 50, max: 400, step: 10 },
    learning_rate: { type: 'float', min: 0.01, max: 0.3 },
    max_depth: { type: 'int', min: 3, max: 12 },
    subsample: { type: 'float', min: 0.5, max: 1.0 },
  },
  svm: {
    C: { type: 'float', min: 0.01, max: 32, log: true },
    gamma: { type: 'float', min: 1e-4, max: 1, log: true },
    kernel: { type: 'categorical', choices: ['linear', 'rbf', 'poly'] },
  },
  logistic_regression: {
    C: { type: 'float', min: 0.01, max: 10, log: true },
    penalty: { type: 'categorical', choices: ['l2', 'l1'] },
  },
};

export class HyperparameterOptimizer {
  private readonly workingDirectory: string;

  constructor(
    private readonly pythonExecutable: string,
    private readonly scriptDirectory: string,
  ) {
    this.workingDirectory = path.join(process.cwd(), 'models', 'hyperparameter-tuning');
  }

  async optimize(
    examples: TrainingExample[],
    options: HyperparameterOptimizationRequest,
  ): Promise<HyperparameterOptimizationResult> {
    if (!examples.length) {
      throw new Error('No training examples available for optimization');
    }

    await fs.mkdir(this.workingDirectory, { recursive: true });

    const searchSpace =
      options.searchSpace || DEFAULT_SEARCH_SPACE[options.modelType] || {};

    const requestPayload = {
      id: randomUUID(),
      modelType: options.modelType,
      searchSpace,
      nTrials: options.nTrials ?? 25,
      timeoutSeconds: options.timeoutSeconds ?? 600,
      examples,
    };

    const inputFile = path.join(
      this.workingDirectory,
      `${requestPayload.id}-input.json`,
    );
    const outputFile = path.join(
      this.workingDirectory,
      `${requestPayload.id}-output.json`,
    );

    await fs.writeFile(inputFile, JSON.stringify(requestPayload));

    await this.runPythonScript('optimize_hyperparameters.py', [inputFile, outputFile]);

    const raw = await fs.readFile(outputFile, 'utf8');
    const parsed = JSON.parse(raw);

    const result: HyperparameterOptimizationResult = {
      modelType: options.modelType,
      bestHyperparameters: parsed.best_hyperparameters || {},
      bestMetrics: {
        accuracy: parsed.best_metrics?.accuracy ?? 0,
        precision: parsed.best_metrics?.precision ?? 0,
        recall: parsed.best_metrics?.recall ?? 0,
        f1Score: parsed.best_metrics?.f1Score ?? 0,
        evaluationDate: parsed.best_metrics?.evaluationDate ?? new Date().toISOString(),
        dataset: parsed.best_metrics?.dataset,
        testSetSize: parsed.best_metrics?.testSetSize,
        context: parsed.best_metrics?.context,
      },
      trials: parsed.trials ?? requestPayload.nTrials,
      studySummary: parsed.study_summary ?? {},
    };

    logger.info('Hyperparameter optimization completed', {
      modelType: options.modelType,
      trials: result.trials,
      bestF1: result.bestMetrics.f1Score,
    });

    return result;
  }

  private async runPythonScript(scriptName: string, args: string[]): Promise<void> {
    const scriptPath = path.join(this.scriptDirectory, scriptName);

    await new Promise<void>((resolve, reject) => {
      const process = spawn(this.pythonExecutable, [scriptPath, ...args], {
        stdio: 'pipe',
      });

      let stderr = '';
      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.stdout?.on('data', (data) => {
        logger.debug(`[optuna] ${data.toString().trim()}`);
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `Hyperparameter optimization failed with code ${code}: ${stderr}`,
            ),
          );
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }
}
