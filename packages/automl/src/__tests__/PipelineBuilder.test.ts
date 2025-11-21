import { PipelineBuilder } from '../pipeline/PipelineBuilder';

describe('PipelineBuilder', () => {
  describe('constructor', () => {
    it('should create a pipeline with the given name', () => {
      const builder = new PipelineBuilder('test-pipeline');
      const pipeline = builder.build();

      expect(pipeline.name).toBe('test-pipeline');
      expect(pipeline.id).toBeDefined();
      expect(pipeline.steps).toEqual([]);
      expect(pipeline.status).toBe('pending');
    });
  });

  describe('addPreprocessing', () => {
    it('should add a preprocessing step', () => {
      const builder = new PipelineBuilder('test');
      builder.addPreprocessing({
        scaling: 'standard',
        encoding: 'onehot',
      });

      const pipeline = builder.build();
      expect(pipeline.steps).toHaveLength(1);
      expect(pipeline.steps[0].type).toBe('preprocessing');
      expect(pipeline.steps[0].config.scaling).toBe('standard');
    });
  });

  describe('addFeatureEngineering', () => {
    it('should add a feature engineering step', () => {
      const builder = new PipelineBuilder('test');
      builder.addFeatureEngineering({
        polynomialDegree: 2,
        interactions: true,
      });

      const pipeline = builder.build();
      expect(pipeline.steps).toHaveLength(1);
      expect(pipeline.steps[0].type).toBe('feature_engineering');
    });
  });

  describe('addModelTraining', () => {
    it('should add a model training step', () => {
      const builder = new PipelineBuilder('test');
      builder.addModelTraining({
        algorithm: 'xgboost',
        hyperparameters: { n_estimators: 100 },
        crossValidation: { method: 'kfold', folds: 5 },
      });

      const pipeline = builder.build();
      expect(pipeline.steps).toHaveLength(1);
      expect(pipeline.steps[0].type).toBe('model_training');
      expect(pipeline.steps[0].name).toBe('Train xgboost');
    });
  });

  describe('addEnsemble', () => {
    it('should add an ensemble step', () => {
      const builder = new PipelineBuilder('test');
      builder.addEnsemble({
        method: 'stacking',
        models: ['xgboost', 'lightgbm'],
      });

      const pipeline = builder.build();
      expect(pipeline.steps).toHaveLength(1);
      expect(pipeline.steps[0].type).toBe('ensemble');
    });
  });

  describe('addDeployment', () => {
    it('should add a deployment step', () => {
      const builder = new PipelineBuilder('test');
      builder.addDeployment({
        target: 'rest_api',
        monitoring: true,
      });

      const pipeline = builder.build();
      expect(pipeline.steps).toHaveLength(1);
      expect(pipeline.steps[0].type).toBe('deployment');
    });
  });

  describe('method chaining', () => {
    it('should support fluent interface', () => {
      const pipeline = new PipelineBuilder('full-pipeline')
        .addPreprocessing({ scaling: 'standard' })
        .addFeatureEngineering({ interactions: true })
        .addModelTraining({
          algorithm: 'random_forest',
          hyperparameters: {},
          crossValidation: { method: 'kfold', folds: 5 },
        })
        .build();

      expect(pipeline.steps).toHaveLength(3);
    });
  });

  describe('validate', () => {
    it('should fail validation for empty pipeline', () => {
      const builder = new PipelineBuilder('empty');
      const result = builder.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Pipeline must have at least one step');
    });

    it('should fail validation without model training', () => {
      const builder = new PipelineBuilder('no-training');
      builder.addPreprocessing({ scaling: 'standard' });
      const result = builder.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Pipeline must include at least one model training step'
      );
    });

    it('should pass validation with model training', () => {
      const builder = new PipelineBuilder('valid');
      builder.addModelTraining({
        algorithm: 'xgboost',
        hyperparameters: {},
        crossValidation: { method: 'kfold', folds: 5 },
      });
      const result = builder.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('clone', () => {
    it('should create a deep copy with new IDs', () => {
      const original = new PipelineBuilder('original')
        .addPreprocessing({ scaling: 'standard' })
        .addModelTraining({
          algorithm: 'xgboost',
          hyperparameters: {},
          crossValidation: { method: 'kfold', folds: 5 },
        })
        .build();

      const cloned = PipelineBuilder.clone(original);

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.steps[0].id).not.toBe(original.steps[0].id);
      expect(cloned.steps).toHaveLength(original.steps.length);
    });
  });

  describe('fromTemplate', () => {
    it('should create quick template pipeline', () => {
      const builder = PipelineBuilder.fromTemplate('quick', 'classification');
      const pipeline = builder.build();

      expect(pipeline.steps.length).toBeGreaterThan(0);
      expect(pipeline.steps.some(s => s.type === 'model_training')).toBe(true);
    });

    it('should create standard template pipeline', () => {
      const builder = PipelineBuilder.fromTemplate('standard', 'regression');
      const pipeline = builder.build();

      expect(pipeline.steps.length).toBeGreaterThan(1);
    });

    it('should create thorough template pipeline with ensemble', () => {
      const builder = PipelineBuilder.fromTemplate('thorough', 'classification');
      const pipeline = builder.build();

      expect(pipeline.steps.some(s => s.type === 'ensemble')).toBe(true);
    });
  });
});
