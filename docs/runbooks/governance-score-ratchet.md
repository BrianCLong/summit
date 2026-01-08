# Governance Score Ratchet

## Purpose

The Governance Score Ratchet prevents compliance backsliding by ensuring that the Governance Completeness Score (GCS) of any new GA release is equal to or better than the established baseline.

## Mechanism

### Baseline Strategy
The baseline is determined by the `ci/governance-score-baseline.lock` file committed in the repository. This ensures determinism and allows for intentional baseline updates (e.g., when improving the score).

### Ratchet Policy
The policy is defined in `ci/governance-score-ratchet.yml`.
- **Enforcement**: Active on GA tags.
- **Tolerance**: Default is 0 points drop allowed.
- **Mandatory Conditions**: Fails if `POLICY_DRIFT`, `EVIDENCE_VERIFY_FAIL`, or `PROMOTION_DENY` codes are present in the score.

### Decision Output
The verification process produces `dist/compliance/governance-score-ratchet-decision.json`:

```json
{
  "decision": "FAIL",
  "current_score": 80,
  "baseline_score": 85,
  "delta": -5,
  "triggered_rules": [
    {
      "code": "SCORE_RATCHET_DROP",
      "message": "Score dropped by 5 points (allowed: 0)..."
    }
  ]
}
```

## Overrides (Break-Glass)

If a release must proceed despite a score drop (e.g., emergency hotfix), a Change Control Bundle is required.

1. **Create Decision Log Entry**:
   - Type: `POLICY_EXCEPTION`
   - Document rationale and expiry.

2. **Generate Change Control Bundle**:
   - Save the bundle as a JSON file.

3. **Provide Bundle to CI**:
   - The workflow looks for a valid bundle path (if configured) or accepts manual override via specific input (implementation specific).
   - *Note*: Currently, the automated check looks for the bundle if `OVERRIDE_BUNDLE_PATH` is set.

## Intentional Baseline Update

To improve the score and ratchet it up:
1. Improve compliance/governance.
2. Run score generation.
3. Update `ci/governance-score-baseline.lock` with the new values.
4. Commit the changes via PR.

## Rollback

To disable enforcement temporarily without an override bundle:
1. Edit `ci/governance-score-ratchet.yml`.
2. Set `enforcement_scopes.ga_tags.enforce` to `false` (though the current script hard-fails on logic; disabling via YAML needs to be respected in script logic if desired, currently the script enforces based on delta).
   - *Correction*: The script logic currently enforces logic unconditionally if it runs. To "disable", one would update the tolerance or the baseline. Or modify the workflow to skip the step.
