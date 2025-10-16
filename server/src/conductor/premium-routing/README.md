# Advanced Premium Model Routing with Thompson Sampling Optimization

This directory contains a sophisticated premium model routing system designed to maximize performance while optimizing costs through intelligent model selection and Thompson sampling algorithms for the IntelGraph platform.

## 🎯 System Overview

The Advanced Premium Model Routing system implements cutting-edge machine learning techniques to automatically select the optimal AI model for each query based on:

- **Thompson Sampling with Contextual Bandits**: Sophisticated exploration-exploitation balance
- **Multi-Armed Bandit Optimization**: Dynamic performance optimization across models
- **Query Complexity Analysis**: Multi-dimensional analysis of query requirements
- **Real-time Cost-Performance Monitoring**: Continuous optimization with budget controls
- **Adaptive Learning**: Models that improve effectiveness over time
- **Dynamic Pricing**: Quality-cost ratio optimization with market responsiveness

## 🏗️ Architecture Components

### Core Routing Engine

- **`premium-model-router.ts`** - Main routing orchestrator with enhanced Thompson sampling integration
- **`advanced-routing-engine.ts`** - Query complexity analysis and sophisticated routing logic
- **`thompson-sampling-engine.ts`** - Contextual bandits implementation with advanced exploration strategies

### Optimization Systems

- **`multi-armed-bandit-optimizer.ts`** - Multi-strategy bandit algorithms (UCB, Epsilon-Greedy, EXP3, LinUCB)
- **`cost-performance-optimizer.ts`** - Real-time cost monitoring with intelligent budget controls
- **`adaptive-learning-system.ts`** - Continuous model effectiveness improvement over time
- **`dynamic-pricing-optimizer.ts`** - Market-responsive pricing with quality-cost optimization

### Model Registry & Analytics

- **`enhanced-premium-models.ts`** - Comprehensive model registry with detailed performance profiles
- **Database Schema** (`schema.sql`) - Production-ready database schema supporting all features

## 🚀 Key Features

### 1. Thompson Sampling with Contextual Bandits

- **Contextual Features**: Query complexity, urgency, domain specialty, quality requirements
- **Beta Distribution Sampling**: Proper statistical exploration-exploitation balance
- **Transfer Learning**: Knowledge sharing between similar contexts
- **Adaptive Exploration**: Dynamic exploration rates based on uncertainty

### 2. Multi-Armed Bandit Optimization

- **Multiple Algorithms**: UCB, Thompson Sampling, Epsilon-Greedy, LinUCB, EXP3
- **Adaptive Strategy Selection**: Automatic algorithm selection based on environment
- **Concept Drift Detection**: Automatic adaptation to changing model performance
- **Cross-Model Learning**: Insights transfer between related models

### 3. Query Complexity Analysis

- **8 Complexity Dimensions**: Linguistic, logical, factual, creative, technical, multimodal, contextual, temporal
- **Resource Estimation**: Accurate cost and latency predictions
- **Model Matching**: Optimal model selection based on query requirements
- **Fallback Strategies**: Comprehensive error handling and degradation paths

### 4. Cost-Performance Optimization

- **Real-time Monitoring**: Continuous tracking of cost, quality, and performance metrics
- **Budget Controls**: Automated budget management with intelligent alerts
- **Dynamic Pricing**: Market-responsive pricing with elasticity modeling
- **ROI Optimization**: Quality-cost ratio maximization

### 5. Adaptive Learning System

- **Continuous Improvement**: Models learn and adapt over time
- **Performance Prediction**: Advanced forecasting of model effectiveness
- **Strength/Weakness Analysis**: Detailed capability profiling
- **Recommendation Engine**: Automated optimization suggestions

## 📊 Performance Metrics

The system tracks comprehensive metrics including:

- **Quality Metrics**: Accuracy, coherence, relevance, completeness, safety
- **Performance Metrics**: Latency, throughput, reliability, availability
- **Cost Metrics**: Token costs, compute costs, total cost of ownership
- **Business Metrics**: Customer satisfaction, retention, ROI

## 🔧 Configuration

### Environment Variables

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/intelgraph
REDIS_URL=redis://localhost:6379
PROMETHEUS_GATEWAY_URL=http://localhost:9091
```

### System Configuration

Key parameters can be configured via the database:

```sql
-- Thompson Sampling Parameters
INSERT INTO system_configuration VALUES
('thompson_sampling.exploration_decay', '0.95'),
('thompson_sampling.min_exploration_rate', '0.1'),
('thompson_sampling.context_similarity_threshold', '0.8');

-- Pricing Parameters
INSERT INTO system_configuration VALUES
('pricing.max_price_change', '0.2'),
('pricing.update_frequency_hours', '1'),
('pricing.profit_margin_target', '0.3');
```

## 🚀 Getting Started

### 1. Database Setup

```bash
# Run database migrations
psql -d intelgraph -f server/src/conductor/premium-routing/schema.sql
```

### 2. Initialize Services

```typescript
import { PremiumModelRouter } from './premium-routing/premium-model-router.js';

const router = new PremiumModelRouter();
await router.connect();
```

### 3. Route Queries

```typescript
const decision = await router.routeToOptimalModel({
  query: 'Analyze the cybersecurity implications of this network topology',
  context: {
    userId: 'user123',
    tenantId: 'tenant456',
    taskType: 'intelligence_analysis',
    urgency: 'high',
    qualityRequirement: 0.9,
    budget: 50.0,
  },
  constraints: {
    maxLatency: 3000,
    requiredCapabilities: ['reasoning', 'analysis'],
  },
});
```

## 📈 Monitoring & Analytics

### Prometheus Metrics

The system exports comprehensive metrics to Prometheus:

- `premium_routing_latency` - Time to make routing decisions
- `thompson_sampling_selection_time` - Thompson sampling performance
- `model_execution_cost` - Per-execution cost tracking
- `quality_cost_ratio` - Quality-cost optimization metrics
- `bandit_regret` - Multi-armed bandit regret measurements

### Dashboard Views

Built-in database views provide real-time analytics:

```sql
-- Performance summary across all models
SELECT * FROM model_performance_summary;

-- Cost performance dashboard
SELECT * FROM cost_performance_dashboard;

-- Thompson sampling effectiveness
SELECT * FROM thompson_sampling_dashboard;
```

## 🔒 Security & Compliance

- **Data Privacy**: All query analysis respects privacy constraints
- **Budget Controls**: Hard limits prevent cost overruns
- **Audit Trails**: Complete logging of all routing decisions
- **Rate Limiting**: Per-tenant and per-model rate limits
- **Access Controls**: Integration with existing RBAC systems

## 🎯 Model Integration

### Supported Premium Models

#### Claude 3.5 Sonnet

- **Strengths**: Advanced reasoning, analysis, code generation
- **Specializations**: Intelligence analysis, research, investigation
- **Optimal Use Cases**: Complex analytical tasks requiring deep reasoning

#### GPT-4o

- **Strengths**: Multimodal capabilities, creative content, broad knowledge
- **Specializations**: Vision analysis, creative writing, general assistance
- **Optimal Use Cases**: Multimodal tasks, content creation, general queries

#### Gemini Ultra 1.5

- **Strengths**: Long context processing, video understanding, scientific reasoning
- **Specializations**: Document analysis, video processing, scientific computation
- **Optimal Use Cases**: Long document analysis, multimedia processing

## 🔄 Continuous Optimization

The system continuously optimizes through:

1. **Performance Feedback Loops**: Real-time learning from execution results
2. **A/B Testing**: Automatic testing of routing strategies
3. **Market Intelligence**: Competitive pricing and positioning analysis
4. **User Feedback Integration**: Quality scoring based on user satisfaction
5. **Predictive Analytics**: Forward-looking optimization based on trends

## 📊 Quality Metrics

### Thompson Sampling Effectiveness

- **Exploration-Exploitation Balance**: Measured via regret bounds
- **Context Utilization**: Effectiveness of contextual features
- **Transfer Learning Success**: Cross-context knowledge transfer

### Routing Accuracy

- **Model Selection Quality**: Post-hoc analysis of routing decisions
- **Cost Efficiency**: Cost savings vs. baseline routing
- **Performance Prediction**: Accuracy of latency and quality forecasts

### Business Impact

- **Cost Reduction**: Measurable cost savings through optimization
- **Quality Improvement**: Enhanced output quality through better routing
- **Customer Satisfaction**: User feedback and retention metrics

## 🛠️ Development & Deployment

### Local Development

```bash
# Install dependencies
npm install

# Run tests
npm run test:premium-routing

# Start development server with hot reload
npm run dev
```

### Production Deployment

```bash
# Build production bundle
npm run build

# Deploy with zero-downtime rolling updates
kubectl apply -f deploy/premium-routing.yaml

# Monitor deployment health
kubectl get pods -l app=premium-routing
```

## 🔍 Troubleshooting

### Common Issues

#### High Routing Latency

- Check database query performance
- Review Thompson sampling complexity
- Consider caching frequently analyzed queries

#### Poor Model Selection

- Verify contextual features are being extracted correctly
- Check if sufficient historical data exists for learning
- Review model capability definitions

#### Cost Overruns

- Verify budget constraint enforcement
- Check dynamic pricing calculations
- Review usage patterns for anomalies

### Debug Logging

Enable detailed logging:

```typescript
process.env.LOG_LEVEL = 'debug';
process.env.ROUTING_DEBUG = 'true';
```

## 🚀 Future Enhancements

### Planned Features

- **Federated Learning**: Cross-tenant knowledge sharing with privacy preservation
- **Reinforcement Learning**: Advanced RL-based routing optimization
- **Causal Inference**: Understanding cause-effect relationships in performance
- **AutoML Integration**: Automated model architecture optimization
- **Blockchain Auditing**: Immutable audit trails for high-stakes decisions

### Research Directions

- **Neural Bandit Algorithms**: Deep learning-based bandit optimization
- **Multi-Objective Optimization**: Pareto-optimal routing decisions
- **Interpretable ML**: Explainable routing decisions for compliance
- **Quantum-Ready Algorithms**: Preparation for quantum computing integration

## 📚 References

- [Thompson Sampling for Contextual Bandits](https://arxiv.org/abs/1506.03374)
- [Multi-Armed Bandit Algorithms](https://banditalgs.com/)
- [Dynamic Pricing in Machine Learning](https://proceedings.mlr.press/v70/ferreira17a.html)
- [Quality-Cost Trade-offs in ML Systems](https://mlsys.org/Conferences/2019/doc/2019/149.pdf)

## 🤝 Contributing

Please refer to the main IntelGraph contributing guidelines. For premium routing specific contributions:

1. All new features must include comprehensive tests
2. Performance benchmarks must be provided for optimization changes
3. Database migrations must be backwards compatible
4. Documentation must be updated for user-facing changes

## 📄 License

This premium routing system is part of the IntelGraph platform and subject to the same licensing terms.
