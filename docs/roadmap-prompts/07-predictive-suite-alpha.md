# Prompt #7: Predictive Threat Suite (Alpha) - Timeline Forecast + Counterfactual

**Target**: Alpha Q4 2025
**Owner**: AI/ML team
**Depends on**: Core GA, graph analytics, XAI capabilities

---

## Pre-Flight Checklist

```bash
# ✅ Check existing predictive services
ls -la services/predictive-suite/ 2>/dev/null || echo "Need to create service"
grep -r "predictiveSuite" charts/ig-platform/values.yaml

# ✅ Verify ML infrastructure
docker ps | grep -E "jupyter|mlflow"

# ✅ Check graph analytics
ls -la services/graph-analytics/
```

---

## Claude Prompt

```
You are implementing the Predictive Threat Suite (Alpha) for IntelGraph - timeline forecasting and counterfactual analysis.

CONTEXT:
- Stack: Python (FastAPI + scikit-learn/PyTorch) OR Node.js + TensorFlow.js
- Existing: services/predictive-suite/ may exist (check Helm chart)
- Graph: Neo4j with temporal data (Event nodes with timestamps)
- Frontend: apps/web/src/components/

REQUIREMENTS:
Build predictive analytics suite (alpha/MVP):

1. **Timeline Forecast API**:
   - POST /forecast/timeline
   - Payload: {caseId, horizon (days), confidenceLevel (0.95)}
   - Input: Historical graph events, temporal patterns
   - Output: {predictions[], confidenceBands, factors[]}
   - Model: Simple time series (ARIMA, Prophet) OR graph-based (GNN)
   - Pluggable: Design for model swapping (stub for alpha)

2. **Forecast Results**:
   - predictions[]: [{timestamp, eventType, probability, entities[]}]
   - confidenceBands: {lower, upper} for each prediction
   - factors[]: Top features influencing prediction (XAI)
   - Example: "80% probability of transaction between A↔B within 7 days"

3. **Counterfactual Simulator**:
   - POST /counterfactual/analyze
   - Payload: {caseId, targetOutcome, currentState}
   - Returns: {minimalChanges[], flipConditions[]}
   - Question: "What minimal changes would prevent outcome X?"
   - Example: "Remove relationship A→B OR add entity C → outcome changes"

4. **Counterfactual Output**:
   - minimalChanges[]: Smallest set of graph edits to flip outcome
   - flipConditions[]: [{type: 'removeEdge', from: A, to: B, impact: 0.8}]
   - Sensitivity: How robust is outcome to perturbations?
   - Render: UI shows graph diff (before/after state)

5. **Explainable AI (XAI) Pane**:
   - apps/web/src/components/predictive/XAIPanel.tsx
   - Display: Which nodes/edges contributed to prediction?
   - Techniques: SHAP, LIME, or simple feature importance
   - Visualization: Highlight entities in graph, show attribution scores
   - Link back: Click entity → See evidence supporting prediction

6. **Reproducibility**:
   - All forecasts: Store model version, hyperparams, random seed
   - Endpoint: GET /forecast/{forecastId}/reproduce
   - Returns: Same result given same inputs (deterministic)
   - Audit: Log model provenance (dataset version, training date)

DELIVERABLES:

1. services/predictive-suite/
   - Framework: FastAPI (Python) OR Express (Node.js + TensorFlow.js)
   - Dockerfile, requirements.txt (or package.json)
   - Helm chart updates: charts/ig-platform/values.yaml (port 4013)

2. services/predictive-suite/src/routes/forecast.py (or .ts)
   - POST /forecast/timeline
   - GET /forecast/{forecastId}
   - GET /forecast/{forecastId}/reproduce

3. services/predictive-suite/src/routes/counterfactual.py (or .ts)
   - POST /counterfactual/analyze
   - GET /counterfactual/{analysisId}

4. services/predictive-suite/src/models/timeline-forecaster.py (or .ts)
   - export class TimelineForecaster
   - Methods: fit(data), predict(horizon), getConfidenceBands()
   - Stub model: Use Prophet or simple moving average for alpha
   - Pluggable: Interface for swapping models later

5. services/predictive-suite/src/models/counterfactual-engine.py (or .ts)
   - export class CounterfactualEngine
   - Methods: findMinimalChanges(graph, targetOutcome)
   - Algorithm: Greedy search or constraint satisfaction
   - Return: List of graph edits with impact scores

6. services/predictive-suite/src/xai/explainer.py (or .ts)
   - export class Explainer
   - Methods: explain(prediction), getFeatureImportance()
   - Use: SHAP (Python), simple gradient-based (Node.js)
   - Return: {features[], scores[], visualizations[]}

7. apps/web/src/components/predictive/PredictivePanel.tsx
   - UI: Timeline with forecast overlay
   - Sliders: Adjust horizon, confidence level
   - Display: Confidence bands as shaded area
   - Sensitivity bars: Show which factors matter most

8. apps/web/src/components/predictive/XAIPanel.tsx
   - Display: Feature importance chart (bar chart)
   - Graph overlay: Highlight nodes/edges by attribution score
   - Click: Entity → Show contribution to prediction

9. apps/web/src/components/predictive/CounterfactualView.tsx
   - Show: Side-by-side graph (current vs. counterfactual)
   - Highlight: Changed edges in red, new entities in green
   - Actions: "Apply counterfactual" → Preview what-if scenario

10. server/src/routes/predictive-proxy.ts
    - Proxy: Frontend → Predictive Suite service
    - GraphQL: Add predictive queries to schema
    - Example: query { forecast(caseId: "123", horizon: 7) { predictions } }

11. Tests:
    - services/predictive-suite/tests/test_forecast.py (or .test.ts)
    - services/predictive-suite/tests/test_counterfactual.py
    - Integration: server/tests/predictive.integration.test.ts
    - Golden dataset: Known outcomes, verify predictions match

ACCEPTANCE CRITERIA:
✅ Forecast returns predictions with confidence bands
✅ Counterfactual finds minimal flip conditions (≤3 changes)
✅ XAI panel shows which entities contributed to prediction
✅ Reproducible: Same seed → Same forecast
✅ UI renders timeline with forecast overlay and sensitivity bars

TECHNICAL CONSTRAINTS:
- Python: Use scikit-learn, prophet, shap (or torch for GNN later)
- Node.js: Use TensorFlow.js, simple-statistics
- Model storage: Save to S3 or local file (pickle or SavedModel)
- Forecast format: JSON with ISO timestamps
- Confidence: Use prediction intervals (not just point estimates)
- Seed control: Set random seed for reproducibility

SAMPLE FORECAST API RESPONSE:
```json
{
  "forecastId": "fc-123",
  "caseId": "case-456",
  "horizon": 7,
  "confidenceLevel": 0.95,
  "predictions": [
    {
      "timestamp": "2025-12-06T10:00:00Z",
      "eventType": "transaction",
      "probability": 0.82,
      "entities": ["entity-A", "entity-B"],
      "confidenceBands": {"lower": 0.65, "upper": 0.93}
    },
    {
      "timestamp": "2025-12-08T14:30:00Z",
      "eventType": "meeting",
      "probability": 0.71,
      "entities": ["entity-C", "entity-D"],
      "confidenceBands": {"lower": 0.50, "upper": 0.85}
    }
  ],
  "factors": [
    {"feature": "historicalFrequency", "importance": 0.45},
    {"feature": "temporalProximity", "importance": 0.30},
    {"feature": "graphDensity", "importance": 0.25}
  ],
  "modelVersion": "v1.0.0-alpha",
  "seed": 42
}
```

SAMPLE COUNTERFACTUAL API RESPONSE:
```json
{
  "analysisId": "cf-789",
  "caseId": "case-456",
  "targetOutcome": "preventTransaction",
  "currentProbability": 0.82,
  "counterfactualProbability": 0.15,
  "minimalChanges": [
    {
      "type": "removeEdge",
      "from": "entity-A",
      "to": "entity-B",
      "relationship": "PARTNERS_WITH",
      "impact": 0.67
    },
    {
      "type": "addEntity",
      "entity": "entity-E",
      "attributes": {"type": "regulator"},
      "impact": 0.20
    }
  ],
  "sensitivity": {
    "robust": false,
    "explanation": "Outcome highly sensitive to A↔B relationship"
  }
}
```

SAMPLE XAI VISUALIZATION (XAIPanel.tsx):
```tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface XAIProps {
  factors: Array<{ feature: string; importance: number }>;
}

export function XAIPanel({ factors }: XAIProps) {
  return (
    <div>
      <h3>Prediction Drivers</h3>
      <BarChart width={600} height={300} data={factors}>
        <XAxis dataKey="feature" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="importance" fill="#8884d8" />
      </BarChart>
      <p>Click on a bar to see contributing entities in the graph.</p>
    </div>
  );
}
```

STUB MODEL (for alpha):
```python
from prophet import Prophet
import pandas as pd

class TimelineForecaster:
    def __init__(self, seed=42):
        self.seed = seed
        self.model = None

    def fit(self, events: list[dict]):
        # events: [{"timestamp": "2025-01-01T00:00:00Z", "count": 5}, ...]
        df = pd.DataFrame(events)
        df.rename(columns={"timestamp": "ds", "count": "y"}, inplace=True)
        self.model = Prophet()
        self.model.fit(df)

    def predict(self, horizon: int):
        future = self.model.make_future_dataframe(periods=horizon)
        forecast = self.model.predict(future)
        return forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(horizon).to_dict('records')
```

OUTPUT:
Provide:
(a) Service implementation (FastAPI or Express)
(b) Stub forecasting model (Prophet or simple)
(c) Counterfactual engine (greedy search)
(d) XAI explainer (feature importance)
(e) React components (PredictivePanel, XAIPanel, CounterfactualView)
(f) API documentation (OpenAPI/Swagger)
(g) Tests (reproducibility, golden dataset)
(h) Helm chart updates
```

---

## Success Metrics

- [ ] Forecast returns predictions with confidence bands
- [ ] Counterfactual finds ≤3 minimal changes
- [ ] XAI shows top 5 contributing factors
- [ ] Reproducibility: Same seed → Same output (10/10 tests)
- [ ] UI renders forecast timeline with sensitivity analysis

---

## Follow-Up Prompts

1. **GNN forecasting**: Replace stub with Graph Neural Network
2. **Causal inference**: Use do-calculus for counterfactuals
3. **Multi-horizon**: Forecast 1d, 7d, 30d simultaneously

---

## References

- Prophet: https://facebook.github.io/prophet/
- SHAP: https://shap.readthedocs.io/
- Counterfactual explanations: https://christophm.github.io/interpretable-ml-book/counterfactual.html
- Helm chart: `charts/ig-platform/values.yaml` (predictiveSuite)
