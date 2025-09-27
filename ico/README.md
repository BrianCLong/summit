# Inference Cost Optimizer (ICO)

ICO couples a Python planner, a Go controller, and a TypeScript dashboard to produce deterministic autoscaling and quantization plans for inference workloads.

- **Planner (`ico/planner`)** ingests model endpoint descriptors, runs what-if simulations, and emits Kubernetes HPA specs plus quantization recipes.
- **Controller (`ico/controller`)** validates planner output and re-hydrates sanitized HPA manifests and quantization recipes for deployment pipelines.
- **Dashboard (`ico/dashboard`)** visualises savings, headroom, and utilization forecasts from planner artifacts.

## Usage

1. Generate a planning document:

   ```bash
   python ico/planner/main.py ico/planner/fixtures/request.json > plan.json
   ```

2. Feed the plan to the controller to obtain runtime artifacts or surface it via the dashboard utilities.

3. Run the included tests to validate determinism and benchmarked savings:

   ```bash
   pytest ico/planner
   (cd ico/controller && go test ./...)
   (cd ico/dashboard && npm install && npm test)
   ```

