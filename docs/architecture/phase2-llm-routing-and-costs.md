
## Phase 2: LLM Routing & Cost Management

### Routing Logic
The `RouterService` selects the best model based on:
1.  **Governance**: Is the model allowed for this task/risk level?
2.  **Capabilities**: Does the model meet the task requirements?
3.  **Cost/Budget**: Is the projected cost within limits?

### Cost Tracking
-   Token usage is estimated per call.
-   `CostEvent`s are emitted to the billing system.
-   Supports model fallback chains.
