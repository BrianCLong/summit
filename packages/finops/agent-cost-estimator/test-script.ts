
import { CostEstimator } from './src/index';

const estimator = new CostEstimator();
const estimate = estimator.estimate('analyze_goal', { goal: 'build a rocket' }, 'gpt-4');

console.log('Estimate:', estimate);

const optimized = estimator.optimize(estimate, 0.01); // Very low budget
console.log('Optimized:', optimized);

if (optimized.estimatedCostUSD > estimate.estimatedCostUSD) {
    throw new Error('Optimization failed to reduce cost');
}
if (optimized.modelTier === 'gpt-4' && estimate.estimatedCostUSD > 0.01) {
     // If budget is low, it should have downgraded
     throw new Error('Optimization failed to downgrade model');
}
console.log('Verification passed');
