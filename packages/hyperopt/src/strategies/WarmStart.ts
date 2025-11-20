import { OptimizationStudy, TrialResult } from '../types';

/**
 * Warm start strategies for transfer learning in hyperparameter optimization
 */
export class WarmStartStrategy {
  /**
   * Initialize study with results from previous similar studies
   */
  static fromPreviousStudy(
    newStudy: OptimizationStudy,
    previousStudy: OptimizationStudy,
    transferRatio: number = 0.2
  ): OptimizationStudy {
    const completedTrials = previousStudy.trials.filter(t => t.status === 'completed');

    // Transfer top N% of trials
    const numToTransfer = Math.ceil(completedTrials.length * transferRatio);
    const sorted = completedTrials
      .sort((a, b) => {
        const objective = previousStudy.config.objective;
        return objective === 'maximize' ? b.score - a.score : a.score - b.score;
      });

    const transferredTrials = sorted.slice(0, numToTransfer).map(trial => ({
      ...trial,
      id: `transferred_${trial.id}`,
      metadata: {
        ...trial.metadata,
        transferredFrom: previousStudy.id,
      },
    }));

    newStudy.trials.push(...transferredTrials);

    // Update best trial
    if (transferredTrials.length > 0) {
      newStudy.bestTrial = transferredTrials[0];
    }

    return newStudy;
  }

  /**
   * Meta-learning initialization from multiple previous studies
   */
  static metaLearningInit(
    newStudy: OptimizationStudy,
    previousStudies: OptimizationStudy[],
    k: number = 3
  ): Record<string, any>[] {
    // Get best configurations from each previous study
    const bestConfigs = previousStudies
      .map(study => study.bestTrial?.parameters)
      .filter((params): params is Record<string, any> => params !== undefined);

    // Select top k most promising configurations
    // In practice, this would use similarity metrics
    return bestConfigs.slice(0, k);
  }

  /**
   * Dataset-based warm start
   */
  static fromSimilarDataset(
    newStudy: OptimizationStudy,
    similarStudies: OptimizationStudy[],
    datasetSimilarity: Record<string, number>
  ): OptimizationStudy {
    const weightedTrials: Array<{ trial: TrialResult; weight: number }> = [];

    for (const study of similarStudies) {
      const similarity = datasetSimilarity[study.id] || 0;
      const completedTrials = study.trials.filter(t => t.status === 'completed');

      for (const trial of completedTrials) {
        weightedTrials.push({ trial, weight: similarity });
      }
    }

    // Sort by weighted score
    weightedTrials.sort((a, b) => {
      const scoreA = a.trial.score * a.weight;
      const scoreB = b.trial.score * b.weight;
      return newStudy.config.objective === 'maximize' ? scoreB - scoreA : scoreA - scoreB;
    });

    // Transfer top trials
    const numToTransfer = Math.min(10, weightedTrials.length);
    const transferredTrials = weightedTrials.slice(0, numToTransfer).map(wt => ({
      ...wt.trial,
      id: `transferred_${wt.trial.id}`,
      metadata: {
        ...wt.trial.metadata,
        transferWeight: wt.weight,
      },
    }));

    newStudy.trials.push(...transferredTrials);

    return newStudy;
  }

  /**
   * Default hyperparameters initialization
   */
  static defaultInitialization(
    searchSpace: any[],
    defaults: Record<string, any>
  ): Record<string, any>[] {
    const configurations: Record<string, any>[] = [defaults];

    // Add variations around defaults
    for (const param of searchSpace) {
      if (defaults[param.name] === undefined) continue;

      const defaultValue = defaults[param.name];
      const config = { ...defaults };

      switch (param.type) {
        case 'int':
        case 'float':
          // Try 2x and 0.5x of default
          config[param.name] = defaultValue * 2;
          configurations.push({ ...config });

          config[param.name] = defaultValue * 0.5;
          configurations.push({ ...config });
          break;

        case 'categorical':
          // Try other values
          for (const value of param.values) {
            if (value !== defaultValue) {
              config[param.name] = value;
              configurations.push({ ...config });
            }
          }
          break;

        case 'boolean':
          // Try opposite
          config[param.name] = !defaultValue;
          configurations.push({ ...config });
          break;
      }
    }

    return configurations;
  }
}
