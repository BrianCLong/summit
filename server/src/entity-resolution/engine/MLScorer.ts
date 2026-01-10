import { FeatureExtractor } from '../models/FeatureExtractor.js';
import { SimilarityModel, ModelPrediction, WeightedRuleBasedModel } from '../models/SimilarityModel.js';

export class MLScorer {
  private model: SimilarityModel;

  constructor(model?: SimilarityModel) {
    this.model = model || new WeightedRuleBasedModel();
  }

  public async score(entityA: any, entityB: any): Promise<ModelPrediction> {
    const features = FeatureExtractor.extract(entityA, entityB);
    return this.model.predict(features);
  }
}
