# AutoML Algorithms Reference

## Classification Algorithms

### Random Forest
**Type**: Ensemble (Bagging)
**Complexity**: Medium
**Best For**: General-purpose classification, feature importance

**Advantages**:
- Handles non-linear relationships
- Built-in feature importance
- Robust to outliers
- Minimal hyperparameter tuning
- Handles missing values (with modifications)

**Disadvantages**:
- Can be slow on large datasets
- Large model size
- Less interpretable than single trees

**Hyperparameters**:
```typescript
{
  n_estimators: 100,      // Number of trees
  max_depth: 10,          // Max tree depth
  min_samples_split: 2,   // Min samples to split node
  min_samples_leaf: 1,    // Min samples in leaf
  max_features: 'sqrt'    // Features per split
}
```

**When to Use**:
- ✅ Tabular data with mixed feature types
- ✅ Need feature importance
- ✅ Robust baseline model
- ❌ Very large datasets (>1M rows)
- ❌ Real-time inference required

### XGBoost
**Type**: Ensemble (Boosting)
**Complexity**: High
**Best For**: Competitions, high-accuracy requirements

**Advantages**:
- State-of-the-art performance
- Handles categorical features
- Built-in regularization
- Handles missing values
- Efficient implementation

**Disadvantages**:
- Requires careful tuning
- Can overfit with small datasets
- Slower training than LightGBM

**Hyperparameters**:
```typescript
{
  n_estimators: 100,
  max_depth: 6,
  learning_rate: 0.3,
  subsample: 1.0,
  colsample_bytree: 1.0,
  gamma: 0,
  reg_alpha: 0,
  reg_lambda: 1
}
```

**When to Use**:
- ✅ Need best possible accuracy
- ✅ Structured/tabular data
- ✅ Have time for hyperparameter tuning
- ❌ Need fast training
- ❌ Model interpretability critical

### LightGBM
**Type**: Ensemble (Boosting)
**Complexity**: Medium-High
**Best For**: Large datasets, fast training

**Advantages**:
- Very fast training
- Memory efficient
- Handles categorical features natively
- Good accuracy
- Supports missing values

**Disadvantages**:
- Can overfit on small datasets
- Requires tuning for best results

**Hyperparameters**:
```typescript
{
  n_estimators: 100,
  max_depth: -1,
  learning_rate: 0.1,
  num_leaves: 31,
  min_child_samples: 20,
  subsample: 1.0,
  colsample_bytree: 1.0
}
```

**When to Use**:
- ✅ Large datasets (>100K rows)
- ✅ Need fast training
- ✅ Categorical features
- ❌ Very small datasets
- ❌ Need maximum accuracy

### Logistic Regression
**Type**: Linear Model
**Complexity**: Low
**Best For**: Baselines, interpretable models

**Advantages**:
- Very fast training and inference
- Highly interpretable
- Works well with linear relationships
- Probabilistic outputs
- Minimal hyperparameters

**Disadvantages**:
- Assumes linear decision boundary
- May underfit complex data
- Sensitive to feature scaling

**Hyperparameters**:
```typescript
{
  C: 1.0,              // Inverse regularization strength
  penalty: 'l2',       // Regularization type
  solver: 'lbfgs',     // Optimization algorithm
  max_iter: 100        // Maximum iterations
}
```

**When to Use**:
- ✅ Need interpretability
- ✅ Linear relationships
- ✅ Fast inference required
- ✅ Good baseline model
- ❌ Complex non-linear patterns
- ❌ Many feature interactions

### Support Vector Machine (SVM)
**Type**: Kernel Method
**Complexity**: High
**Best For**: Small-medium datasets, non-linear boundaries

**Advantages**:
- Effective in high dimensions
- Memory efficient (uses support vectors)
- Versatile (different kernels)
- Works well with clear margin

**Disadvantages**:
- Slow training on large datasets
- Sensitive to feature scaling
- Difficult to tune
- No probabilistic outputs (by default)

**Hyperparameters**:
```typescript
{
  C: 1.0,              // Regularization parameter
  kernel: 'rbf',       // Kernel type
  gamma: 'scale',      // Kernel coefficient
  degree: 3            // For polynomial kernel
}
```

**When to Use**:
- ✅ Small-medium datasets (<10K rows)
- ✅ High-dimensional data
- ✅ Clear margin of separation
- ❌ Large datasets
- ❌ Need probability estimates

### Neural Networks
**Type**: Deep Learning
**Complexity**: Very High
**Best For**: Complex patterns, large datasets

**Advantages**:
- Can model any function (universal approximator)
- Excellent with complex patterns
- Scales to very large datasets
- Handles various data types

**Disadvantages**:
- Requires large datasets
- Computationally expensive
- Many hyperparameters
- Black box (less interpretable)
- Prone to overfitting

**Hyperparameters**:
```typescript
{
  hidden_layers: [100, 50],
  activation: 'relu',
  learning_rate: 0.001,
  batch_size: 32,
  epochs: 100,
  dropout: 0.2
}
```

**When to Use**:
- ✅ Very large datasets (>100K rows)
- ✅ Complex non-linear patterns
- ✅ Sufficient computational resources
- ❌ Small datasets
- ❌ Need interpretability
- ❌ Limited compute

## Regression Algorithms

### Linear Regression
**Type**: Linear Model
**Complexity**: Low
**Best For**: Linear relationships, baselines

**Advantages**:
- Extremely fast
- Highly interpretable
- No hyperparameters
- Analytical solution

**Disadvantages**:
- Assumes linear relationships
- Sensitive to outliers
- May underfit

**When to Use**:
- ✅ Linear relationships
- ✅ Need interpretability
- ✅ Fast inference
- ❌ Non-linear patterns

### Random Forest Regressor
**Type**: Ensemble (Bagging)
**Complexity**: Medium
**Best For**: Non-linear regression, robust predictions

**Similar to classification version**

### XGBoost Regressor
**Type**: Ensemble (Boosting)
**Complexity**: High
**Best For**: High-accuracy regression

**Similar to classification version**

### Gradient Boosting Regressor
**Type**: Ensemble (Boosting)
**Complexity**: High
**Best For**: Accurate predictions, handles mixed types

**Advantages**:
- High accuracy
- Handles non-linearity well
- Feature importance

**Disadvantages**:
- Slower than LightGBM
- Requires tuning
- Can overfit

## Hyperparameter Optimization Strategies

### Bayesian Optimization
**Best For**: Expensive objective functions

**How it Works**:
1. Build probabilistic model (Gaussian Process)
2. Use acquisition function to select next point
3. Update model with new observation
4. Repeat

**Acquisition Functions**:
- **Expected Improvement (EI)**: Balance exploration/exploitation
- **Upper Confidence Bound (UCB)**: Optimistic selection
- **Probability of Improvement (POI)**: Simple approach

**When to Use**:
- ✅ Expensive model training
- ✅ Continuous hyperparameters
- ✅ Limited budget
- ❌ Very large search space
- ❌ Discrete-only parameters

### Random Search
**Best For**: Initial exploration, baselines

**How it Works**:
- Randomly sample from search space
- Evaluate each configuration
- Select best result

**When to Use**:
- ✅ Large search space
- ✅ Unknown optimal regions
- ✅ Need diverse exploration
- ✅ Parallelizable
- ❌ Very limited budget

### Grid Search
**Best For**: Small search spaces, thorough exploration

**How it Works**:
- Define grid of parameter values
- Evaluate all combinations
- Select best result

**When to Use**:
- ✅ Small search space
- ✅ Discrete parameters
- ✅ Want complete coverage
- ❌ Many parameters
- ❌ Continuous parameters

### Genetic Algorithm
**Best For**: Complex search spaces, discrete/mixed parameters

**How it Works**:
1. Initialize population
2. Evaluate fitness
3. Select parents
4. Crossover and mutation
5. Repeat

**When to Use**:
- ✅ Mixed parameter types
- ✅ Complex constraints
- ✅ Multi-objective optimization
- ❌ Very large populations needed
- ❌ Fast convergence required

## Neural Architecture Search Strategies

### Reinforcement Learning (RL)
**Best For**: Large search spaces

**How it Works**:
- Controller network proposes architectures
- Train and evaluate each architecture
- Update controller with performance feedback

**Advantages**:
- Can discover novel architectures
- Handles complex search spaces

**Disadvantages**:
- Computationally expensive
- Requires many evaluations

### Evolutionary Search
**Best For**: Moderate budgets, interpretable search

**How it Works**:
- Population of architectures
- Mutation and crossover
- Selection based on performance

**Advantages**:
- Interpretable search process
- Good exploration
- Handles constraints well

**Disadvantages**:
- Slower than gradient-based
- Requires population size tuning

### Differentiable Architecture Search (DARTS)
**Best For**: Fast search, continuous relaxation

**How it Works**:
- Relax discrete choices to continuous
- Use gradient descent
- Derive discrete architecture

**Advantages**:
- Much faster than RL/evolutionary
- Memory efficient

**Disadvantages**:
- May not find globally optimal
- Architecture derivation heuristics

### Hardware-Aware NAS
**Best For**: Deployment-constrained scenarios

**Considerations**:
- Latency constraints
- Memory constraints
- Energy efficiency
- Target device (mobile/edge/GPU)

**Metrics**:
- FLOPs (floating point operations)
- Latency (inference time)
- Model size (parameters)
- Energy consumption

## Algorithm Selection Guide

### By Dataset Size

**Small (<1K rows)**:
1. Logistic/Linear Regression
2. Random Forest
3. SVM

**Medium (1K-100K rows)**:
1. XGBoost
2. LightGBM
3. Random Forest
4. Neural Networks

**Large (>100K rows)**:
1. LightGBM
2. Neural Networks
3. XGBoost
4. Linear models

### By Feature Type

**Mostly Numeric**:
1. XGBoost
2. Neural Networks
3. SVM

**Mixed Numeric/Categorical**:
1. LightGBM
2. XGBoost
3. Random Forest

**High Cardinality Categorical**:
1. LightGBM
2. Target encoding + XGBoost
3. Neural Networks with embeddings

**Text Features**:
1. Neural Networks
2. Logistic Regression with TF-IDF
3. Gradient Boosting with text features

### By Performance Requirements

**Maximum Accuracy**:
1. Ensemble of XGBoost + LightGBM + NN
2. XGBoost with extensive tuning
3. Neural Networks with large architecture

**Fast Training**:
1. LightGBM
2. Linear models
3. Random Forest with few trees

**Fast Inference**:
1. Linear models
2. Small Random Forest
3. Pruned Neural Networks

**Interpretability**:
1. Logistic/Linear Regression
2. Decision Trees
3. Random Forest with feature importance

## Meta-Learning Strategies

### Algorithm Recommendation
```typescript
// Based on dataset meta-features
const metaFeatures = {
  numSamples: 10000,
  numFeatures: 50,
  numClasses: 2,
  classBalance: 0.5,
  featureCorrelation: 0.3,
  noiseLevel: 0.1
};

const recommended = metaLearning.recommendAlgorithm(metaFeatures);
// Returns: { algorithm: 'xgboost', confidence: 0.85 }
```

### Warm Starting
```typescript
// Transfer hyperparameters from similar tasks
const warmStart = metaLearning.suggestWarmStart(metaFeatures);
// Returns: [
//   { sourceDataset: 'similar-1', transferability: 0.9, suggestedHyperparameters: {...} },
//   { sourceDataset: 'similar-2', transferability: 0.8, suggestedHyperparameters: {...} }
// ]
```

## Performance Comparison

### Classification (Typical Performance)

| Algorithm | Accuracy | Training Speed | Inference Speed | Interpretability |
|-----------|----------|----------------|-----------------|------------------|
| Logistic Regression | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Random Forest | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| XGBoost | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| LightGBM | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| SVM | ⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐ | ⭐⭐ |
| Neural Networks | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐ | ⭐ |

## Resources

- [User Guide](./GUIDE.md)
- [Best Practices](./BEST_PRACTICES.md)
- [API Documentation](./api-reference.md)
