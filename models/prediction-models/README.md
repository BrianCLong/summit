# Prediction Models

Pre-configured prediction models for various analytics tasks.

## Directory Structure

```
models/prediction-models/
├── time-series/       # Time series forecasting models
├── classification/    # Classification models
├── regression/        # Regression models
├── survival/          # Survival analysis models
├── risk/              # Risk scoring models
└── churn/             # Churn prediction models
```

## Usage Examples

### Survival Analysis (Kaplan-Meier)

```typescript
import { KaplanMeierEstimator } from './survival/kaplan-meier-estimator.js';

const estimator = new KaplanMeierEstimator();
estimator.fit([
  { time: 5, event: true },
  { time: 10, event: false },
  { time: 15, event: true },
]);

const survivalAt10 = estimator.survivalAt(10);
const medianTime = estimator.getMedianSurvivalTime();
```

### Churn Prediction

```typescript
import { ChurnPredictor } from './churn/churn-predictor.js';

const predictor = new ChurnPredictor();

// Train
predictor.fit(trainingFeatures, trainingLabels);

// Predict
const prediction = predictor.predict('customer_123', {
  tenure: 24,
  monthlyCharges: 65.0,
  totalCharges: 1560.0,
  contractType: 'month-to-month',
  paymentMethod: 'credit-card',
  numServices: 3,
  supportTickets: 2,
  lastActivity: 15,
});

console.log(prediction.churnProbability); // 0.35
console.log(prediction.retentionActions); // ['Send re-engagement campaign']
```

## Model Types

### 1. Time Series Models
- ARIMA forecasters
- Seasonal decomposition
- Prophet-style models
- LSTM networks

### 2. Classification Models
- Random Forest
- Gradient Boosting
- Logistic Regression
- Neural Networks

### 3. Regression Models
- Linear Regression
- Ridge/Lasso
- Polynomial Regression
- Support Vector Regression

### 4. Survival Models
- Kaplan-Meier Estimator
- Cox Proportional Hazards
- AFT Models

### 5. Risk Models
- Credit Risk Scoring
- Fraud Detection
- Threat Assessment

### 6. Churn Models
- Customer Churn Prediction
- Cohort Analysis
- CLV Estimation
