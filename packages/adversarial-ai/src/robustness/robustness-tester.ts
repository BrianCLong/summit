import {
  RobustnessTestResult,
  DefenseEvaluationResult,
  BackdoorDetectionResult,
  PoisoningDetectionResult,
  AdversarialAttackType,
  DefenseMechanism
} from '../types';
import { FGSMAttack } from '../attacks/fgsm';
import { PGDAttack } from '../attacks/pgd';
import { CarliniWagnerAttack } from '../attacks/cw';
import { DeepFoolAttack } from '../attacks/deepfool';

/**
 * Comprehensive robustness testing framework
 */
export class RobustnessTester {
  /**
   * Test model robustness against multiple attacks
   */
  async testRobustness(
    testData: number[][],
    trueLabels: number[],
    predict: (input: number[]) => Promise<number[]>,
    getGradients: (input: number[]) => Promise<number[]>,
    attackType: AdversarialAttackType,
    config: { epsilon?: number; iterations?: number }
  ): Promise<RobustnessTestResult> {
    const fgsmAttack = new FGSMAttack();
    const pgdAttack = new PGDAttack();
    const cwAttack = new CarliniWagnerAttack();
    const deepfoolAttack = new DeepFoolAttack();

    const results = [];
    let successfulAttacks = 0;
    let totalPerturbation = 0;
    let totalConfidenceDrop = 0;

    for (let i = 0; i < testData.length; i++) {
      const input = testData[i];
      const trueLabel = trueLabels[i];

      // Get original prediction
      const originalLogits = await predict(input);
      const originalClass = this.argmax(originalLogits);
      const originalConfidence = Math.max(...originalLogits);

      // Skip if already misclassified
      if (originalClass !== trueLabel) continue;

      // Generate adversarial example
      let adversarialExample;

      switch (attackType) {
        case AdversarialAttackType.FGSM:
          const gradients = await getGradients(input);
          adversarialExample = await fgsmAttack.generate(input, gradients, config);
          break;

        case AdversarialAttackType.PGD:
          adversarialExample = await pgdAttack.generate(input, getGradients, config);
          break;

        case AdversarialAttackType.CW:
          adversarialExample = await cwAttack.generateL2(
            input,
            async (inp) => {
              const logits = await predict(inp);
              return -logits[originalClass]; // Loss for untargeted attack
            },
            getGradients,
            config
          );
          break;

        case AdversarialAttackType.DEEPFOOL:
          adversarialExample = await deepfoolAttack.generate(
            input,
            predict,
            async (inp, classIdx) => {
              // Simplified gradient computation
              return getGradients(inp);
            },
            config
          );
          break;

        default:
          throw new Error(`Unsupported attack type: ${attackType}`);
      }

      // Evaluate adversarial example
      const advLogits = await predict(adversarialExample.perturbedInput);
      const advClass = this.argmax(advLogits);
      const advConfidence = Math.max(...advLogits);

      adversarialExample.originalPrediction = originalClass;
      adversarialExample.adversarialPrediction = advClass;
      adversarialExample.confidence = advConfidence;

      // Check if attack was successful
      if (advClass !== originalClass) {
        successfulAttacks++;
      }

      totalPerturbation += adversarialExample.perturbationNorm;
      totalConfidenceDrop += originalConfidence - advConfidence;

      results.push(adversarialExample);
    }

    const numSamples = results.length;
    const successRate = successfulAttacks / numSamples;
    const avgPerturbation = totalPerturbation / numSamples;
    const avgConfidenceDrop = totalConfidenceDrop / numSamples;

    // Robustness score: inverse of success rate weighted by perturbation
    const robustnessScore = (1 - successRate) * (1 / (avgPerturbation + 0.1));

    return {
      testId: this.generateId(),
      modelId: 'unknown',
      attackType,
      totalSamples: numSamples,
      successfulAttacks,
      successRate,
      averagePerturbation: avgPerturbation,
      averageConfidenceDrop: avgConfidenceDrop,
      robustnessScore,
      results,
      metadata: {
        config,
        testDate: new Date().toISOString()
      },
      timestamp: new Date()
    };
  }

  /**
   * Test certified robustness
   */
  async testCertifiedRobustness(
    testData: number[][],
    predict: (input: number[]) => Promise<number[]>,
    epsilon: number
  ): Promise<{
    certifiedAccuracy: number;
    certifiedSamples: number;
    totalSamples: number;
  }> {
    let certifiedSamples = 0;

    for (const input of testData) {
      // Simplified randomized smoothing certification
      const predictions: number[] = [];

      // Sample noisy predictions
      const numSamples = 100;
      for (let i = 0; i < numSamples; i++) {
        const noisyInput = input.map(val => {
          const noise = (Math.random() - 0.5) * 2 * epsilon;
          return Math.max(0, Math.min(1, val + noise));
        });

        const logits = await predict(noisyInput);
        predictions.push(this.argmax(logits));
      }

      // Check if majority vote is stable
      const counts = new Map<number, number>();
      predictions.forEach(p => {
        counts.set(p, (counts.get(p) || 0) + 1);
      });

      const maxCount = Math.max(...counts.values());
      const certificationThreshold = 0.7 * numSamples;

      if (maxCount >= certificationThreshold) {
        certifiedSamples++;
      }
    }

    return {
      certifiedAccuracy: certifiedSamples / testData.length,
      certifiedSamples,
      totalSamples: testData.length
    };
  }

  /**
   * Test out-of-distribution detection
   */
  async testOODDetection(
    inDistData: number[][],
    outDistData: number[][],
    predict: (input: number[]) => Promise<number[]>,
    threshold: number = 0.5
  ): Promise<{
    auroc: number;
    detectionAccuracy: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
  }> {
    const scores: Array<{ score: number; isOOD: boolean }> = [];

    // Score in-distribution samples
    for (const input of inDistData) {
      const logits = await predict(input);
      const maxProb = Math.max(...this.softmax(logits));
      scores.push({ score: maxProb, isOOD: false });
    }

    // Score out-of-distribution samples
    for (const input of outDistData) {
      const logits = await predict(input);
      const maxProb = Math.max(...this.softmax(logits));
      scores.push({ score: maxProb, isOOD: true });
    }

    // Compute metrics
    let tp = 0, fp = 0, tn = 0, fn = 0;

    for (const { score, isOOD } of scores) {
      const predictedOOD = score < threshold;

      if (predictedOOD && isOOD) tp++;
      else if (predictedOOD && !isOOD) fp++;
      else if (!predictedOOD && !isOOD) tn++;
      else fn++;
    }

    const detectionAccuracy = (tp + tn) / scores.length;
    const fpr = fp / (fp + tn + 1e-10);
    const fnr = fn / (fn + tp + 1e-10);

    // Compute AUROC
    const auroc = this.computeAUROC(scores);

    return {
      auroc,
      detectionAccuracy,
      falsePositiveRate: fpr,
      falseNegativeRate: fnr
    };
  }

  /**
   * Evaluate defense mechanisms
   */
  async evaluateDefense(
    defenseMechanism: DefenseMechanism,
    cleanData: number[][],
    adversarialData: number[][],
    predict: (input: number[]) => Promise<number[]>,
    trueLabels: number[]
  ): Promise<DefenseEvaluationResult> {
    // Evaluate on clean data
    let cleanCorrect = 0;
    for (let i = 0; i < cleanData.length; i++) {
      const logits = await predict(cleanData[i]);
      const predicted = this.argmax(logits);
      if (predicted === trueLabels[i]) cleanCorrect++;
    }
    const cleanAccuracy = cleanCorrect / cleanData.length;

    // Evaluate on adversarial data
    let robustCorrect = 0;
    let detected = 0;

    for (let i = 0; i < adversarialData.length; i++) {
      const logits = await predict(adversarialData[i]);
      const predicted = this.argmax(logits);

      if (predicted === trueLabels[i]) {
        robustCorrect++;
      }

      // Check if adversarial example was detected
      const maxProb = Math.max(...this.softmax(logits));
      if (maxProb < 0.5) {
        detected++;
      }
    }

    const robustAccuracy = robustCorrect / adversarialData.length;
    const accuracyDrop = cleanAccuracy - robustAccuracy;
    const detectionRate = detected / adversarialData.length;

    // False positive rate (clean examples detected as adversarial)
    let falsePositives = 0;
    for (const input of cleanData) {
      const logits = await predict(input);
      const maxProb = Math.max(...this.softmax(logits));
      if (maxProb < 0.5) falsePositives++;
    }
    const falsePositiveRate = falsePositives / cleanData.length;

    return {
      evaluationId: this.generateId(),
      defenseMechanism,
      cleanAccuracy,
      robustAccuracy,
      accuracyDrop,
      detectionRate,
      falsePositiveRate,
      metadata: {
        cleanSamples: cleanData.length,
        adversarialSamples: adversarialData.length,
        testDate: new Date().toISOString()
      }
    };
  }

  /**
   * Detect backdoors in model
   */
  async detectBackdoor(
    modelId: string,
    validationData: number[][],
    predict: (input: number[]) => Promise<number[]>,
    getActivations: (input: number[], layer: string) => Promise<number[]>
  ): Promise<BackdoorDetectionResult> {
    // Analyze activation patterns
    const activations: number[][] = [];

    for (const input of validationData) {
      const acts = await getActivations(input, 'final');
      activations.push(acts);
    }

    // Detect anomalous neurons using statistical analysis
    const neuronStats = this.analyzeNeuronActivations(activations);
    const suspiciousNeurons = neuronStats
      .map((stat, idx) => ({ idx, ...stat }))
      .filter(n => n.anomalyScore > 2.5)
      .map(n => n.idx);

    // Check if backdoor is present
    const isBackdoored = suspiciousNeurons.length > 0;
    const confidence = Math.min(suspiciousNeurons.length / 10, 1.0);

    return {
      detectionId: this.generateId(),
      modelId,
      isBackdoored,
      confidence,
      suspiciousNeurons,
      metadata: {
        method: 'Activation-Clustering',
        validationSamples: validationData.length,
        detectionThreshold: 2.5
      }
    };
  }

  /**
   * Detect poisoning in dataset
   */
  async detectPoisoning(
    datasetId: string,
    trainingData: number[][],
    labels: number[],
    predict: (input: number[]) => Promise<number[]>
  ): Promise<PoisoningDetectionResult> {
    const poisonedSamples: string[] = [];

    // Detect outliers using influence analysis
    for (let i = 0; i < trainingData.length; i++) {
      const input = trainingData[i];
      const label = labels[i];

      // Check if sample causes unusual predictions
      const logits = await predict(input);
      const predicted = this.argmax(logits);
      const confidence = Math.max(...this.softmax(logits));

      // Flag samples with very high confidence but potentially wrong
      if (confidence > 0.95 && predicted !== label) {
        poisonedSamples.push(`sample_${i}`);
      }

      // Check for distributional anomalies
      const isOutlier = this.checkOutlier(input, trainingData);
      if (isOutlier) {
        poisonedSamples.push(`sample_${i}`);
      }
    }

    const uniquePoisoned = [...new Set(poisonedSamples)];
    const poisonRate = uniquePoisoned.length / trainingData.length;

    return {
      detectionId: this.generateId(),
      datasetId,
      poisonedSamples: uniquePoisoned,
      poisonRate,
      detectionConfidence: poisonRate > 0.01 ? 0.8 : 0.5,
      poisonType: 'label-flip-or-backdoor',
      metadata: {
        totalSamples: trainingData.length,
        method: 'Outlier-Detection'
      }
    };
  }

  private analyzeNeuronActivations(
    activations: number[][]
  ): Array<{ mean: number; std: number; anomalyScore: number }> {
    if (activations.length === 0) return [];

    const numNeurons = activations[0].length;
    const stats: Array<{ mean: number; std: number; anomalyScore: number }> = [];

    for (let i = 0; i < numNeurons; i++) {
      const values = activations.map(a => a[i]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);

      // Anomaly score based on activation distribution
      const maxVal = Math.max(...values);
      const anomalyScore = std > 0 ? (maxVal - mean) / std : 0;

      stats.push({ mean, std, anomalyScore });
    }

    return stats;
  }

  private checkOutlier(sample: number[], dataset: number[][]): boolean {
    // Simple distance-based outlier detection
    const distances = dataset.map(s => this.l2Distance(sample, s));
    distances.sort((a, b) => a - b);

    const medianDistance = distances[Math.floor(distances.length / 2)];
    const ownDistance = this.l2Distance(sample, sample);

    // Check if sample is far from others
    const nearestNeighbors = distances.slice(1, 6); // Exclude self
    const avgNearestDist = nearestNeighbors.reduce((a, b) => a + b, 0) / nearestNeighbors.length;

    return avgNearestDist > 2 * medianDistance;
  }

  private l2Distance(a: number[], b: number[]): number {
    return Math.sqrt(
      a.reduce((sum, val, idx) => sum + Math.pow(val - b[idx], 2), 0)
    );
  }

  private softmax(logits: number[]): number[] {
    const maxLogit = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxLogit));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }

  private argmax(array: number[]): number {
    return array.indexOf(Math.max(...array));
  }

  private computeAUROC(
    scores: Array<{ score: number; isOOD: boolean }>
  ): number {
    // Sort by score
    const sorted = [...scores].sort((a, b) => b.score - a.score);

    let tp = 0;
    let fp = 0;
    const totalPositive = scores.filter(s => s.isOOD).length;
    const totalNegative = scores.length - totalPositive;

    let auc = 0;
    let prevFpr = 0;

    for (const { isOOD } of sorted) {
      if (isOOD) {
        tp++;
      } else {
        fp++;
        const tpr = tp / totalPositive;
        const fpr = fp / totalNegative;
        auc += (fpr - prevFpr) * tpr;
        prevFpr = fpr;
      }
    }

    return auc;
  }

  private generateId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
