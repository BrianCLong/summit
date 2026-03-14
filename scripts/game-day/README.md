# Governance Bypass Drill Harness

This directory contains the game-day drill test harness to simulate governance bypass scenarios and validate that branch protections and other security controls successfully block unapproved actions. It operates completely in a dry-run/simulation capacity by validating expected outcomes from local assertions against snapshot fixture data without altering live environments or branch rules.

## Scenarios Covered

1. **Force Push**: Attempting to force-push (`git push -f`) over the main branch.
2. **Review Dismissal**: Attempting to dismiss an approved PR review via the API without proper privileges.
3. **CI Skip**: Attempting to merge a PR using `[skip ci]` when status checks are explicitly required.
4. **Direct Push**: Attempting to commit and push directly to `main` without a pull request.
5. **Permission Escalation**: Attempting to modify branch protections or escalate repository permissions.

## Execution

To execute the game-day drill, run the following command from the root of the repository:

```bash
./scripts/game-day/run-governance-drill.sh
```

### Interpretation of Results

The drill script outputs a structured JSON report.
- The **summary** section details total scenarios tested, how many passed, and how many failed.
- The **results** list provides specifics on a per-scenario basis, comparing the `expected_outcome` (defined in `validation/governance/assertions.yaml`) against the `actual_outcome` (provided in the scenario's mock payload under `fixtures/governance/`).

A non-zero exit code is emitted if *any* scenario fails (e.g., if a mock test bypasses governance successfully instead of being "blocked").

## Adding a New Scenario

1. **Define the Assertion**:
   Open `validation/governance/assertions.yaml` and append a new scenario map:
   ```yaml
   - id: new_scenario_id
     name: "Description of Scenario Attempt"
     description: "Contextual detail."
     expected_outcome: "blocked"
     expected_reason: "reason why it is blocked"
   ```

2. **Add Fixture Data**:
   Create a mock output payload in `fixtures/governance/{new_scenario_id}.json`:
   ```json
   {
     "scenario_id": "new_scenario_id",
     "actual_outcome": "blocked",
     "actual_reason": "API response or rejection detail"
   }
   ```

3. **Verify**:
   Run the harness to ensure your new test properly loads and registers as passing.
