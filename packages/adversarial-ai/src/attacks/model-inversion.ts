import { ModelInversionResult, MembershipInferenceResult, ModelExtractionResult } from '../types';

/**
 * Model Inversion Attack
 *
 * Reconstructs training data by inverting the model.
 */
export class ModelInversionAttack {
  /**
   * Perform model inversion to reconstruct input for target class
   */
  async invert(
    targetClass: number,
    inputDimension: number,
    predict: (input: number[]) => Promise<number[]>,
    getGradients: (input: number[], targetClass: number) => Promise<number[]>,
    config: { iterations?: number; learningRate?: number }
  ): Promise<ModelInversionResult> {
    const iterations = config.iterations || 10000;
    const learningRate = config.learningRate || 0.1;

    // Initialize with random input
    let reconstructedInput = Array.from({ length: inputDimension }, () => Math.random());

    let bestLoss = Infinity;
    let bestReconstruction: number[] = [];

    for (let iter = 0; iter < iterations; iter++) {
      // Get prediction
      const logits = await predict(reconstructedInput);
      const confidence = logits[targetClass];

      // Calculate loss (negative log probability)
      const loss = -Math.log(Math.max(confidence, 1e-10));

      // Track best reconstruction
      if (loss < bestLoss) {
        bestLoss = loss;
        bestReconstruction = [...reconstructedInput];
      }

      // Get gradients
      const gradients = await getGradients(reconstructedInput, targetClass);

      // Gradient descent
      reconstructedInput = reconstructedInput.map((val, idx) => {
        const newVal = val - learningRate * gradients[idx];
        return Math.max(0, Math.min(1, newVal)); // Clip to valid range
      });

      // Add regularization (prefer natural-looking images)
      if (iter % 100 === 0) {
        reconstructedInput = this.applyTotalVariationRegularization(
          reconstructedInput,
          0.01
        );
      }
    }

    // Final confidence
    const finalLogits = await predict(bestReconstruction);
    const finalConfidence = finalLogits[targetClass];

    return {
      inversionId: this.generateId(),
      targetClass,
      reconstructedInput: bestReconstruction,
      confidence: finalConfidence,
      iterations,
      loss: bestLoss,
      metadata: {
        method: 'Gradient-Based-Inversion',
        learningRate
      }
    };
  }

  /**
   * Model inversion with prior knowledge
   */
  async invertWithPrior(
    targetClass: number,
    priorSamples: number[][],
    predict: (input: number[]) => Promise<number[]>,
    getGradients: (input: number[], targetClass: number) => Promise<number[]>,
    config: { iterations?: number }
  ): Promise<ModelInversionResult> {
    const iterations = config.iterations || 5000;

    // Start from mean of prior samples
    let reconstructedInput = this.computeMean(priorSamples);

    let bestConfidence = 0;
    let bestReconstruction: number[] = [];

    for (let iter = 0; iter < iterations; iter++) {
      const logits = await predict(reconstructedInput);
      const confidence = logits[targetClass];

      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestReconstruction = [...reconstructedInput];
      }

      const gradients = await getGradients(reconstructedInput, targetClass);

      // Update toward target class
      reconstructedInput = reconstructedInput.map((val, idx) => {
        const newVal = val - 0.1 * gradients[idx];
        return Math.max(0, Math.min(1, newVal));
      });

      // Stay close to prior distribution
      const priorMean = this.computeMean(priorSamples);
      reconstructedInput = reconstructedInput.map((val, idx) => {
        return 0.9 * val + 0.1 * priorMean[idx];
      });
    }

    return {
      inversionId: this.generateId(),
      targetClass,
      reconstructedInput: bestReconstruction,
      confidence: bestConfidence,
      iterations,
      loss: -Math.log(bestConfidence),
      metadata: {
        method: 'Prior-Guided-Inversion',
        priorSamples: priorSamples.length
      }
    };
  }

  private applyTotalVariationRegularization(
    input: number[],
    weight: number
  ): number[] {
    // Simple smoothing for 1D case
    const smoothed = [...input];
    for (let i = 1; i < input.length - 1; i++) {
      smoothed[i] = (1 - weight) * input[i] +
                    weight * (input[i - 1] + input[i + 1]) / 2;
    }
    return smoothed;
  }

  private computeMean(samples: number[][]): number[] {
    if (samples.length === 0) return [];

    const mean = new Array(samples[0].length).fill(0);
    for (const sample of samples) {
      sample.forEach((val, idx) => {
        mean[idx] += val / samples.length;
      });
    }
    return mean;
  }

  private generateId(): string {
    return `inversion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Membership Inference Attack
 *
 * Determines if a sample was in the training set.
 */
export class MembershipInferenceAttack {
  /**
   * Perform membership inference using confidence scores
   */
  async infer(
    targetSample: number[],
    predict: (input: number[]) => Promise<number[]>,
    shadowModelPredictions: number[][],
    membershipLabels: boolean[]
  ): Promise<MembershipInferenceResult> {
    // Get target model prediction
    const targetLogits = await predict(targetSample);
    const targetConfidence = Math.max(...targetLogits);
    const targetEntropy = this.computeEntropy(targetLogits);

    // Train simple threshold-based classifier on shadow model
    const threshold = this.learnThreshold(
      shadowModelPredictions,
      membershipLabels
    );

    // Infer membership
    const isMember = targetConfidence > threshold;

    // Compute accuracy metrics
    const { accuracy, tpr, fpr } = this.computeMetrics(
      shadowModelPredictions,
      membershipLabels,
      threshold
    );

    return {
      inferenceId: this.generateId(),
      sampleId: this.hashSample(targetSample),
      isMember,
      confidence: Math.abs(targetConfidence - threshold) / threshold,
      attackAccuracy: accuracy,
      truePositiveRate: tpr,
      falsePositiveRate: fpr,
      metadata: {
        method: 'Confidence-Threshold',
        threshold,
        targetConfidence,
        targetEntropy
      }
    };
  }

  /**
   * Advanced membership inference using metric-based attack
   */
  async inferAdvanced(
    targetSample: number[],
    predict: (input: number[]) => Promise<number[]>,
    shadowModels: Array<(input: number[]) => Promise<number[]>>,
    trainingData: number[][],
    testData: number[][]
  ): Promise<MembershipInferenceResult> {
    // Collect predictions from shadow models
    const targetLogits = await predict(targetSample);

    // Extract features for attack model
    const features = this.extractFeatures(targetLogits);

    // Train attack model on shadow model data
    const { members, nonMembers } = await this.collectShadowData(
      shadowModels,
      trainingData,
      testData
    );

    // Simple metric-based decision
    const memberScore = this.computeSimilarity(features, members);
    const nonMemberScore = this.computeSimilarity(features, nonMembers);

    const isMember = memberScore > nonMemberScore;
    const confidence = Math.abs(memberScore - nonMemberScore) /
                      (memberScore + nonMemberScore);

    return {
      inferenceId: this.generateId(),
      sampleId: this.hashSample(targetSample),
      isMember,
      confidence,
      attackAccuracy: 0.7, // Placeholder
      truePositiveRate: 0.75,
      falsePositiveRate: 0.25,
      metadata: {
        method: 'Metric-Based',
        shadowModels: shadowModels.length,
        memberScore,
        nonMemberScore
      }
    };
  }

  private computeEntropy(logits: number[]): number {
    const probs = this.softmax(logits);
    return -probs.reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);
  }

  private softmax(logits: number[]): number[] {
    const maxLogit = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxLogit));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }

  private learnThreshold(
    predictions: number[][],
    labels: boolean[]
  ): number {
    const confidences = predictions.map(p => Math.max(...p));

    // Find threshold that maximizes accuracy
    const sortedConfidences = [...confidences].sort((a, b) => a - b);
    let bestThreshold = 0.5;
    let bestAccuracy = 0;

    for (const threshold of sortedConfidences) {
      let correct = 0;
      for (let i = 0; i < confidences.length; i++) {
        const predicted = confidences[i] > threshold;
        if (predicted === labels[i]) correct++;
      }
      const accuracy = correct / confidences.length;
      if (accuracy > bestAccuracy) {
        bestAccuracy = accuracy;
        bestThreshold = threshold;
      }
    }

    return bestThreshold;
  }

  private computeMetrics(
    predictions: number[][],
    labels: boolean[],
    threshold: number
  ): { accuracy: number; tpr: number; fpr: number } {
    let tp = 0, fp = 0, tn = 0, fn = 0;

    for (let i = 0; i < predictions.length; i++) {
      const confidence = Math.max(...predictions[i]);
      const predicted = confidence > threshold;
      const actual = labels[i];

      if (predicted && actual) tp++;
      else if (predicted && !actual) fp++;
      else if (!predicted && !actual) tn++;
      else fn++;
    }

    const accuracy = (tp + tn) / (tp + tn + fp + fn);
    const tpr = tp / (tp + fn + 1e-10);
    const fpr = fp / (fp + tn + 1e-10);

    return { accuracy, tpr, fpr };
  }

  private extractFeatures(logits: number[]): number[] {
    const probs = this.softmax(logits);
    const maxProb = Math.max(...probs);
    const entropy = this.computeEntropy(logits);
    const sortedProbs = [...probs].sort((a, b) => b - a);
    const margin = sortedProbs[0] - sortedProbs[1];

    return [maxProb, entropy, margin, ...sortedProbs.slice(0, 3)];
  }

  private async collectShadowData(
    shadowModels: Array<(input: number[]) => Promise<number[]>>,
    trainingData: number[][],
    testData: number[][]
  ): Promise<{ members: number[][]; nonMembers: number[][] }> {
    const members: number[][] = [];
    const nonMembers: number[][] = [];

    for (const model of shadowModels) {
      // Collect features for training data (members)
      for (const sample of trainingData.slice(0, 10)) {
        const logits = await model(sample);
        members.push(this.extractFeatures(logits));
      }

      // Collect features for test data (non-members)
      for (const sample of testData.slice(0, 10)) {
        const logits = await model(sample);
        nonMembers.push(this.extractFeatures(logits));
      }
    }

    return { members, nonMembers };
  }

  private computeSimilarity(features: number[], dataset: number[][]): number {
    if (dataset.length === 0) return 0;

    // Compute average cosine similarity
    let totalSimilarity = 0;
    for (const sample of dataset) {
      const dot = features.reduce((sum, val, idx) => sum + val * sample[idx], 0);
      const norm1 = Math.sqrt(features.reduce((sum, val) => sum + val * val, 0));
      const norm2 = Math.sqrt(sample.reduce((sum, val) => sum + val * val, 0));
      totalSimilarity += dot / (norm1 * norm2 + 1e-10);
    }
    return totalSimilarity / dataset.length;
  }

  private hashSample(sample: number[]): string {
    return `sample_${sample.slice(0, 5).join('_')}_${Date.now()}`;
  }

  private generateId(): string {
    return `membership_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Model Extraction Attack
 *
 * Steals model functionality by querying and building surrogate.
 */
export class ModelExtractionAttack {
  /**
   * Extract model using random queries
   */
  async extract(
    predict: (input: number[]) => Promise<number[]>,
    inputDimension: number,
    numClasses: number,
    config: { queryBudget?: number }
  ): Promise<ModelExtractionResult> {
    const queryBudget = config.queryBudget || 10000;

    const queryInputs: number[][] = [];
    const queryOutputs: number[][] = [];

    // Collect training data for surrogate model
    for (let i = 0; i < queryBudget; i++) {
      const input = Array.from({ length: inputDimension }, () => Math.random());
      const output = await predict(input);

      queryInputs.push(input);
      queryOutputs.push(output);
    }

    // Train simple surrogate model (linear model for demonstration)
    const weights = this.trainLinearModel(queryInputs, queryOutputs, numClasses);

    // Evaluate extraction quality
    const testInputs = Array.from({ length: 100 }, () =>
      Array.from({ length: inputDimension }, () => Math.random())
    );

    let agreementCount = 0;
    for (const input of testInputs) {
      const originalOutput = await predict(input);
      const extractedOutput = this.predictLinear(input, weights);

      const originalClass = this.argmax(originalOutput);
      const extractedClass = this.argmax(extractedOutput);

      if (originalClass === extractedClass) {
        agreementCount++;
      }
    }

    const fidelity = agreementCount / testInputs.length;

    return {
      extractionId: this.generateId(),
      queryCount: queryBudget,
      extractedModelAccuracy: 0, // Would need labeled test set
      fidelity,
      agreementRate: fidelity,
      extractedParameters: {
        type: 'linear',
        weights: weights,
        inputDimension,
        numClasses
      },
      metadata: {
        method: 'Random-Query',
        queryBudget
      }
    };
  }

  /**
   * Extract model using active learning
   */
  async extractWithActiveLearning(
    predict: (input: number[]) => Promise<number[]>,
    inputDimension: number,
    numClasses: number,
    config: { queryBudget?: number }
  ): Promise<ModelExtractionResult> {
    const queryBudget = config.queryBudget || 10000;

    const queryInputs: number[][] = [];
    const queryOutputs: number[][] = [];

    // Initial random sampling
    for (let i = 0; i < Math.min(100, queryBudget); i++) {
      const input = Array.from({ length: inputDimension }, () => Math.random());
      const output = await predict(input);
      queryInputs.push(input);
      queryOutputs.push(output);
    }

    // Active learning: query uncertain regions
    for (let i = 100; i < queryBudget; i++) {
      // Generate candidate inputs
      const candidates = Array.from({ length: 10 }, () =>
        Array.from({ length: inputDimension }, () => Math.random())
      );

      // Select input with highest uncertainty (max entropy)
      let maxEntropy = -1;
      let selectedInput: number[] = candidates[0];

      for (const candidate of candidates) {
        const output = await predict(candidate);
        const entropy = this.computeEntropy(output);

        if (entropy > maxEntropy) {
          maxEntropy = entropy;
          selectedInput = candidate;
          queryOutputs.push(output);
        }
      }

      queryInputs.push(selectedInput);
    }

    // Train surrogate
    const weights = this.trainLinearModel(queryInputs, queryOutputs, numClasses);

    // Evaluate
    const testInputs = Array.from({ length: 100 }, () =>
      Array.from({ length: inputDimension }, () => Math.random())
    );

    let agreementCount = 0;
    for (const input of testInputs) {
      const originalOutput = await predict(input);
      const extractedOutput = this.predictLinear(input, weights);

      if (this.argmax(originalOutput) === this.argmax(extractedOutput)) {
        agreementCount++;
      }
    }

    return {
      extractionId: this.generateId(),
      queryCount: queryBudget,
      extractedModelAccuracy: 0,
      fidelity: agreementCount / testInputs.length,
      agreementRate: agreementCount / testInputs.length,
      extractedParameters: {
        type: 'linear-active',
        weights,
        inputDimension,
        numClasses
      },
      metadata: {
        method: 'Active-Learning',
        queryBudget
      }
    };
  }

  private trainLinearModel(
    inputs: number[][],
    outputs: number[][],
    numClasses: number
  ): number[][] {
    const inputDim = inputs[0].length;
    const weights: number[][] = Array.from({ length: numClasses }, () =>
      Array.from({ length: inputDim }, () => Math.random() * 0.01)
    );

    // Simple gradient descent
    const learningRate = 0.01;
    const epochs = 100;

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const target = outputs[i];
        const predicted = this.predictLinear(input, weights);

        // Update weights
        for (let c = 0; c < numClasses; c++) {
          const error = target[c] - predicted[c];
          for (let j = 0; j < inputDim; j++) {
            weights[c][j] += learningRate * error * input[j];
          }
        }
      }
    }

    return weights;
  }

  private predictLinear(input: number[], weights: number[][]): number[] {
    return weights.map(w => {
      return w.reduce((sum, wi, idx) => sum + wi * input[idx], 0);
    });
  }

  private computeEntropy(logits: number[]): number {
    const probs = this.softmax(logits);
    return -probs.reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);
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

  private generateId(): string {
    return `extraction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
