/**
 * Customer Churn Prediction Model
 */

export interface ChurnFeatures {
  tenure: number;
  monthlyCharges: number;
  totalCharges: number;
  contractType: 'month-to-month' | 'one-year' | 'two-year';
  paymentMethod: string;
  numServices: number;
  supportTickets: number;
  lastActivity: number; // days since last activity
}

export interface ChurnPrediction {
  customerId: string;
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high';
  retentionActions: string[];
  clvImpact: number;
}

export class ChurnPredictor {
  private coefficients: Map<string, number> = new Map();
  private intercept: number = 0;
  private fitted: boolean = false;

  /**
   * Fit the churn prediction model
   */
  fit(features: ChurnFeatures[], labels: boolean[]): void {
    // Simple logistic regression with feature engineering
    const X = features.map(f => this.featureEngineering(f));
    const y = labels.map(l => l ? 1 : 0);

    // Gradient descent
    const learningRate = 0.01;
    const iterations = 1000;
    const nFeatures = X[0].length;

    let weights = new Array(nFeatures).fill(0);
    this.intercept = 0;

    for (let iter = 0; iter < iterations; iter++) {
      const predictions = X.map(x =>
        this.sigmoid(this.intercept + x.reduce((sum, xi, i) => sum + xi * weights[i], 0))
      );

      // Update weights
      for (let j = 0; j < nFeatures; j++) {
        let grad = 0;
        for (let i = 0; i < y.length; i++) {
          grad += (predictions[i] - y[i]) * X[i][j];
        }
        weights[j] -= learningRate * grad / y.length;
      }

      // Update intercept
      let interceptGrad = 0;
      for (let i = 0; i < y.length; i++) {
        interceptGrad += predictions[i] - y[i];
      }
      this.intercept -= learningRate * interceptGrad / y.length;
    }

    // Store coefficients
    this.coefficients.set('tenure', weights[0]);
    this.coefficients.set('monthlyCharges', weights[1]);
    this.coefficients.set('totalCharges', weights[2]);
    this.coefficients.set('contractRisk', weights[3]);
    this.coefficients.set('activityRisk', weights[4]);
    this.coefficients.set('supportRisk', weights[5]);

    this.fitted = true;
  }

  /**
   * Predict churn for a customer
   */
  predict(customerId: string, features: ChurnFeatures): ChurnPrediction {
    if (!this.fitted) {
      throw new Error('Model must be fitted first');
    }

    const x = this.featureEngineering(features);
    const score = this.intercept + x.reduce((sum, xi, i) => {
      const coef = Array.from(this.coefficients.values())[i];
      return sum + xi * coef;
    }, 0);

    const churnProbability = this.sigmoid(score);
    const riskLevel = this.getRiskLevel(churnProbability);
    const retentionActions = this.recommendRetentionActions(features, churnProbability);
    const clvImpact = this.calculateCLVImpact(features, churnProbability);

    return {
      customerId,
      churnProbability,
      riskLevel,
      retentionActions,
      clvImpact,
    };
  }

  /**
   * Feature engineering
   */
  private featureEngineering(features: ChurnFeatures): number[] {
    return [
      features.tenure / 100, // Normalize
      features.monthlyCharges / 100,
      features.totalCharges / 1000,
      features.contractType === 'month-to-month' ? 1 : 0, // Contract risk
      features.lastActivity / 30, // Activity risk
      features.supportTickets / 10, // Support risk
    ];
  }

  /**
   * Get risk level
   */
  private getRiskLevel(probability: number): 'low' | 'medium' | 'high' {
    if (probability >= 0.7) return 'high';
    if (probability >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Recommend retention actions
   */
  private recommendRetentionActions(features: ChurnFeatures, probability: number): string[] {
    const actions: string[] = [];

    if (probability >= 0.7) {
      actions.push('Immediate outreach by retention specialist');
      actions.push('Offer premium support package');
    }

    if (features.contractType === 'month-to-month' && probability >= 0.5) {
      actions.push('Offer incentive for annual contract');
    }

    if (features.supportTickets > 5) {
      actions.push('Schedule account review call');
    }

    if (features.lastActivity > 30) {
      actions.push('Send re-engagement campaign');
    }

    return actions;
  }

  /**
   * Calculate CLV impact of churn
   */
  private calculateCLVImpact(features: ChurnFeatures, probability: number): number {
    // Simplified CLV calculation
    const monthlyValue = features.monthlyCharges;
    const expectedLifetime = features.tenure + 12; // Expected additional months
    const clv = monthlyValue * expectedLifetime;
    return clv * probability; // Expected loss
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
}
