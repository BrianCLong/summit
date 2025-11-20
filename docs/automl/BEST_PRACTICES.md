# AutoML Best Practices

## Data Preparation

### 1. Data Quality
- **Remove duplicates**: Clean duplicate records before training
- **Handle missing values**: Choose imputation strategy based on data distribution
- **Fix data types**: Ensure correct type assignment (numeric vs categorical)
- **Check for leakage**: Remove features that wouldn't be available at prediction time

### 2. Feature Selection
- **Domain knowledge**: Include features that make sense for the problem
- **Remove constant features**: Features with zero variance provide no information
- **Check correlations**: Remove highly correlated features (>0.95)
- **Consider cardinality**: High-cardinality categoricals may need special handling

### 3. Train/Test Split
- **Stratified splits**: Use for classification to maintain class distribution
- **Time-based splits**: Use for time series data
- **Proper validation**: Hold out test set for final evaluation
- **No data leakage**: Scale/encode based only on training data

## Model Selection

### 1. Algorithm Choice
- **Start simple**: Try linear models first as baselines
- **Consider complexity**: Balance model complexity with data size
- **Ensemble methods**: Often provide best performance
- **Domain-specific**: Use specialized algorithms when applicable

### 2. Hyperparameter Optimization
- **Use Bayesian optimization**: More efficient than grid search for expensive models
- **Set reasonable bounds**: Constrain search space based on experience
- **Early stopping**: Stop unpromising configurations early
- **Budget wisely**: Allocate more budget to promising algorithms

### 3. Cross-Validation
```typescript
// Good: Stratified K-Fold for imbalanced classification
crossValidation: {
  method: 'stratified',
  folds: 5
}

// Good: Time series split for temporal data
crossValidation: {
  method: 'timeseries',
  folds: 5
}
```

## Feature Engineering

### 1. Automated Feature Generation
```typescript
featureEngineering: {
  enabled: true,
  maxFeatures: 100,  // Don't generate too many
  polynomialDegree: 2,  // Higher degrees = overfitting risk
  interactions: true,
  statistical: true
}
```

### 2. Feature Selection
- **Use importance-based selection**: Remove low-importance features
- **Set thresholds**: `importanceThreshold: 0.01`
- **Monitor performance**: Ensure feature selection improves validation scores

### 3. Domain-Specific Features
- **Time-based**: Extract hour, day, month, season for temporal data
- **Text**: Use TF-IDF, embeddings for text features
- **Geospatial**: Calculate distances, cluster locations
- **Financial**: Create rolling averages, ratios

## Performance Optimization

### 1. Computational Efficiency
```typescript
// Set reasonable limits
const config = {
  timeLimit: 3600,  // 1 hour
  maxModels: 10,    // Don't try too many
  maxEvaluations: 50,  // For hyperparameter tuning
  parallelism: 4    // Use multiple cores
};
```

### 2. Memory Management
- **Batch processing**: Process large datasets in chunks
- **Feature selection**: Reduce dimensionality before training
- **Sparse matrices**: Use for one-hot encoded data
- **Incremental learning**: For very large datasets

### 3. Early Stopping
```typescript
// Stop unpromising trials
earlyStoppingRounds: 10,

// Use median pruning
import { EarlyStoppingStrategy } from '@intelgraph/hyperopt';
EarlyStoppingStrategy.medianPruning(study, trial, step);
```

## Model Evaluation

### 1. Metrics Selection
```typescript
// Classification metrics
{
  optimizationMetric: 'f1Score',  // For imbalanced data
  // or 'accuracy' for balanced data
  // or 'auc' for ROC curves
}

// Regression metrics
{
  optimizationMetric: 'rmse',  // For large errors matter
  // or 'mae' for outlier robustness
  // or 'r2' for explained variance
}
```

### 2. Multiple Metrics
```typescript
// Track multiple metrics
metrics: {
  accuracy: 0.92,
  precision: 0.89,
  recall: 0.95,
  f1Score: 0.92,
  auc: 0.96
}
```

### 3. Validation Strategy
- **Cross-validation**: For model selection
- **Holdout set**: For final evaluation
- **Never use test set**: During model development

## Ensemble Methods

### 1. When to Use Ensembles
- ✅ Multiple strong base models
- ✅ Diverse predictions
- ✅ Production environment allows complexity
- ❌ Severe latency constraints
- ❌ Model interpretability required

### 2. Ensemble Configuration
```typescript
ensemble: {
  enabled: true,
  method: 'stacking',  // Usually best
  maxModels: 5,  // Don't include too many
}
```

### 3. Ensemble Types
- **Voting**: Simple average, works well
- **Stacking**: Best performance, more complex
- **Boosting**: Sequential improvement
- **Bagging**: Reduce variance

## Meta-Learning

### 1. Warm Start
```typescript
const metaLearning = new MetaLearningEngine();

// Extract meta-features
const metaFeatures = metaLearning.extractMetaFeatures(datasetInfo);

// Get recommendations
const recommendation = metaLearning.recommendAlgorithm(metaFeatures);

// Use warm start
const warmStart = metaLearning.suggestWarmStart(metaFeatures);
```

### 2. Transfer Learning
- **Similar domains**: Transfer from related tasks
- **Similar data distributions**: Use historical hyperparameters
- **Cold start**: Use meta-learning for new domains

## Deployment

### 1. Model Deployment
```typescript
const deployment = await deployer.deploy(modelId, {
  target: 'rest_api',
  scaling: {
    minInstances: 2,
    maxInstances: 20,
    targetCPU: 70
  },
  monitoring: {
    enabled: true,
    metrics: ['latency', 'errorRate'],
    alertThresholds: {
      errorRate: 0.05,
      latency: 1000  // ms
    }
  }
});
```

### 2. A/B Testing
```typescript
abTesting: {
  enabled: true,
  trafficSplit: 0.1,  // 10% to new model
  baselineModelId: 'model-v1'
}
```

### 3. Monitoring
- **Track performance**: Monitor accuracy over time
- **Detect drift**: Alert when data distribution changes
- **Log predictions**: For debugging and retraining
- **Set up alerts**: For errors and latency

## Common Pitfalls

### 1. Data Leakage
❌ **Wrong**: Scale entire dataset then split
```typescript
scaleData(allData);
const [train, test] = split(allData);
```

✅ **Correct**: Fit scaler on training data only
```typescript
const [train, test] = split(allData);
scaler.fit(train);
train = scaler.transform(train);
test = scaler.transform(test);
```

### 2. Overfitting
- **Symptom**: High training score, low validation score
- **Solutions**:
  - Increase regularization
  - Reduce model complexity
  - Get more data
  - Use ensemble methods
  - Apply cross-validation

### 3. Class Imbalance
```typescript
preprocessing: {
  balanceClasses: true  // Use SMOTE or class weights
}
```

### 4. Ignoring Business Metrics
- **Technical metrics**: Accuracy, F1, etc.
- **Business metrics**: Revenue impact, user satisfaction
- **Cost-benefit**: False positive vs false negative costs

## Performance Checklist

Before Production:
- [ ] Data quality validated
- [ ] No data leakage
- [ ] Appropriate metrics selected
- [ ] Cross-validation performed
- [ ] Model performance acceptable
- [ ] Inference latency measured
- [ ] Model size optimized
- [ ] Monitoring configured
- [ ] Rollback plan ready
- [ ] Documentation complete

## Intelligence Operations Specifics

### 1. Adversarial Robustness
- Test model against adversarial examples
- Use robust training techniques
- Monitor for concept drift

### 2. Explainability
```typescript
// Always enable explainability for intelligence ops
const explanation = await explainer.explain(modelId, prediction);
console.log('Feature contributions:', explanation.featureImportance);
```

### 3. Privacy & Security
- Use differential privacy when needed
- Encrypt models at rest and in transit
- Audit access to training data
- Implement secure inference

### 4. Rapid Adaptation
```typescript
// Use online learning for evolving threats
const pipeline = builder
  .addOnlineLearning({
    updateFrequency: 'hourly',
    windowSize: 1000
  })
  .build();
```

## Resources

- [User Guide](./GUIDE.md)
- [Algorithm Reference](./ALGORITHMS.md)
- [API Documentation](./api-reference.md)
- [Examples](/examples/automl/)
