import React, { useMemo, useState } from 'react';
import { computePlanDiff, summarizePlan } from './planDiff';
import type { PlanDiffResult, SignedPlan } from './types';

const SAMPLE_PREVIOUS_PLAN = `{
  "plan_id": "6f890c2cceebf4f9c4e57371e15b1268731759482d097cbd9fe6c0ce95a3751f",
  "created_at": "2025-01-01T00:00:00Z",
  "objective_cost": 412.5,
  "solver_status": "Optimal",
  "placements": {
    "dataset-a": ["us-east-1"],
    "dataset-b": ["eu-central-1"]
  },
  "inputs_digest": "prev-digest",
  "signature": {
    "algorithm": "HS256",
    "value": "prev-signature"
  }
}`;

const SAMPLE_CURRENT_PLAN = `{
  "plan_id": "8c5fbb1296f5f7fc342bb0b84afdf9d748728132221ffadcb78c492f7aac402d",
  "created_at": "2025-01-02T00:00:00Z",
  "objective_cost": 398.75,
  "solver_status": "Optimal",
  "placements": {
    "dataset-a": ["us-east-1"],
    "dataset-b": ["eu-west-1"]
  },
  "inputs_digest": "curr-digest",
  "signature": {
    "algorithm": "HS256",
    "value": "curr-signature"
  }
}`;

function parsePlan(value: string): SignedPlan | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return JSON.parse(trimmed) as SignedPlan;
}

const App: React.FC = () => {
  const [previousPlanText, setPreviousPlanText] = useState<string>(SAMPLE_PREVIOUS_PLAN);
  const [currentPlanText, setCurrentPlanText] = useState<string>(SAMPLE_CURRENT_PLAN);
  const [error, setError] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<PlanDiffResult | null>(null);

  const previousPlan = useMemo(() => {
    try {
      return parsePlan(previousPlanText);
    } catch (err) {
      return null;
    }
  }, [previousPlanText]);

  const currentPlan = useMemo(() => {
    try {
      return parsePlan(currentPlanText);
    } catch (err) {
      return null;
    }
  }, [currentPlanText]);

  const handleDiff = () => {
    setError(null);
    try {
      const prev = parsePlan(previousPlanText);
      const curr = parsePlan(currentPlanText);
      if (!prev || !curr) {
        setError('Both plans must be valid JSON payloads.');
        return;
      }
      const diff = computePlanDiff(prev, curr);
      setDiffResult(diff);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to compute diff.');
    }
  };

  return (
    <main>
      <h1>Data Residency Optimizer</h1>
      <p>
        Paste signed plan JSON outputs below to visualize placements and deterministic plan diffs. The
        example plans are preloaded so you can try the workflow immediately.
      </p>

      <section>
        <h2>Previous plan</h2>
        <textarea
          value={previousPlanText}
          onChange={(event) => setPreviousPlanText(event.target.value)}
          aria-label="Previous signed plan"
        />
        <pre>{summarizePlan(previousPlan)}</pre>
      </section>

      <section>
        <h2>Current plan</h2>
        <textarea
          value={currentPlanText}
          onChange={(event) => setCurrentPlanText(event.target.value)}
          aria-label="Current signed plan"
        />
        <pre>{summarizePlan(currentPlan)}</pre>
      </section>

      <section>
        <button onClick={handleDiff} disabled={!previousPlanText.trim() || !currentPlanText.trim()}>
          Compute diff
        </button>
        {error ? <p role="alert">{error}</p> : null}
        {diffResult ? <pre>{JSON.stringify(diffResult, null, 2)}</pre> : null}
      </section>
    </main>
  );
};

export default App;
