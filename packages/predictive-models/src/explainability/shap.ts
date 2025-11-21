/**
 * SHAP (SHapley Additive exPlanations) for Model Explainability
 */

import type { ShapValue } from '../types/index.js';

export class ShapExplainer {
  private model: any;
  private backgroundData: number[][];

  constructor(model: any, backgroundData: number[][]) {
    this.model = model;
    this.backgroundData = backgroundData;
  }

  /**
   * Calculate SHAP values for a single prediction
   */
  explainInstance(instance: number[]): ShapValue[] {
    const nFeatures = instance.length;
    const shapValues: ShapValue[] = [];

    // Calculate baseline prediction (average over background)
    const baselinePredictions = this.model.predict(this.backgroundData);
    const baseline = baselinePredictions.reduce((a: number, b: any) =>
      a + (typeof b === 'number' ? b : b.prediction), 0) / baselinePredictions.length;

    // Calculate SHAP value for each feature using kernel SHAP approximation
    for (let i = 0; i < nFeatures; i++) {
      const shapValue = this.calculateFeatureShap(instance, i, baseline);

      shapValues.push({
        feature: `feature_${i}`,
        shapValue,
        featureValue: instance[i],
      });
    }

    return shapValues;
  }

  /**
   * Calculate SHAP value for a specific feature
   */
  private calculateFeatureShap(instance: number[], featureIndex: number, baseline: number): number {
    const nSamples = Math.min(100, this.backgroundData.length);
    let shapValue = 0;

    // Sample from background data
    for (let i = 0; i < nSamples; i++) {
      const background = this.backgroundData[i];

      // Prediction with feature
      const withFeature = [...background];
      withFeature[featureIndex] = instance[featureIndex];
      const predWith = this.model.predict([withFeature])[0];
      const predWithValue = typeof predWith === 'number' ? predWith : predWith.prediction;

      // Prediction without feature
      const predWithout = this.model.predict([background])[0];
      const predWithoutValue = typeof predWithout === 'number' ? predWithout : predWithout.prediction;

      shapValue += (predWithValue - predWithoutValue);
    }

    return shapValue / nSamples;
  }

  /**
   * Get global feature importances
   */
  globalFeatureImportance(data: number[][]): Array<{ feature: string; importance: number }> {
    const allShapValues: number[][] = [];

    for (const instance of data) {
      const shapValues = this.explainInstance(instance);
      allShapValues.push(shapValues.map(sv => Math.abs(sv.shapValue)));
    }

    // Average absolute SHAP values
    const nFeatures = allShapValues[0].length;
    const importances: Array<{ feature: string; importance: number }> = [];

    for (let i = 0; i < nFeatures; i++) {
      const avgImportance = allShapValues.reduce((sum, sv) => sum + sv[i], 0) / allShapValues.length;

      importances.push({
        feature: `feature_${i}`,
        importance: avgImportance,
      });
    }

    return importances.sort((a, b) => b.importance - a.importance);
  }
}
