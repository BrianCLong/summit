
## LLM Routing Incident

### Symptom
-   "No valid model found" errors.
-   Cost spikes.

### Diagnosis
1.  Check `RoutingRule` for the task category.
2.  Verify `ModelProfile` status (is provider down?).
3.  Check Budget vs CostEvents.

### Mitigation
-   Temporarily enable fallback models in `RoutingRule`.
-   Increase budget cap if authorized.
