# Runbook: Graph Shape Guardrail Alert

## Symptom
The `graph-shape-guardrail` CI gate or nightly job fails with an alert.

## Meaning
A significant change in graph connectivity "shape" has been detected for one or more node labels. This often indicates:
- **Join Explosion**: A bug in ETL causing massive fan-out of relationships.
- **Missing Edges**: Ingestion failure for specific relationship types.
- **Orientation Flip**: Relationships being created in the wrong direction.
- **Label Leakage**: Nodes receiving labels they shouldn't.

## Triage Steps
1. **Identify the affected label**: Check the `report.json` artifact or CI output.
2. **Examine metrics**:
   - `skewness`: Large increase means a few nodes became super-hubs. Large decrease means hubs were lost.
   - `top1%_mass`: Increase means degree concentration has intensified.
3. **Compare with baseline**: Check the trend of these metrics over the last 14 days in the warehouse.
4. **Review recent mapping changes**: Check PRs that touched the ETL or graph schema for the affected labels.

## Resolution
- If the change is expected (e.g., product launch), update the baseline or thresholds in `configs/graph_shape_guardrail.yaml`.
- If it's a regression, rollback the offending ETL change.
