# Hello Workflows: End-to-End References

These reference flows exercise the IntelGraph knowledge graph, meta orchestrator, and generative action translation so teams can validate the entire control path after each deploy.

## Hello-World (Smoke)
- **Path:** Staging build for `svc-hello` using the IntelGraph context (service, environment, pipeline, policy lookup) and the meta orchestrator planner/executor derived from the IntelGraph pipeline definition.
- **Signals:** Pricing feed selects the lowest-cost compliant provider; audit sink captures plan+execution entries; telemetry is derived from the reward signals.
- **Expected outcome:** Both stages execute successfully without approvals. The audit log contains plan records and telemetry shows near-100% audit completeness.

## Hello-Case (Load)
- **Path:** Production deploy for `svc-case` with an open critical incident and `high-risk` policy tag.
- **Signals:** GenerativeActionTranslator requires approval and enqueues the plan; Azure is selected as the cheapest path, intentionally fails, and the orchestrator self-heals by failing over to AWS using the IntelGraph-derived fallback strategies.
- **Expected outcome:** Fallback traces are marked as recovered, reward updates are recorded, and aggregated telemetry across multiple runs shows a non-zero self-healing rate under sustained load.

## How to run locally
- Smoke: `npm run test:smoke`
- Load/soak: `npm run test:load`
- Full suite: `npm run test --workspace meta-orchestrator`

## Post-deploy automation
- `.github/workflows/post-deploy-verification.yml` runs the smoke and load workflows on every successful deployment.
- The workflow posts a PR comment (when a PR is associated with the deployment ref) summarizing smoke/load results and the workflow URL so reviewers can gate merges on the latest deploy health.
