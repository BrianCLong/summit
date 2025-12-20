/**
 * Predictive Models Package - Classification and Regression
 * @module @summit/predictive-models
 */

// Types
export * from './types/index.js';

// Classifiers
export { RandomForestClassifier, type RandomForestConfig } from './classifiers/random-forest.js';
export { GradientBoostingClassifier, type GradientBoostingConfig } from './classifiers/gradient-boosting.js';

// Regressors
export { LinearRegression, RidgeRegression, LassoRegression, type RegressionConfig } from './regressors/linear-regression.js';

// Optimization
export { GridSearchCV, RandomSearchCV, type ParameterSpace, type OptimizerConfig } from './optimization/hyperparameter-tuning.js';

// Explainability
export { ShapExplainer } from './explainability/shap.js';
