# REO Dashboard Utilities

This package provides lightweight TypeScript helpers to render comparison dashboards for
Responsible Evaluation Orchestrator (REO) runs. It ingests JSON artifacts exported by the
Python orchestrator and produces stratified rollups that highlight regressions with confidence
intervals.

## Usage

```ts
import { ComparisonData, RegressionHighlight } from "./dist";
```

See `src/example.ts` for a usage snippet that drives a dashboard component.
