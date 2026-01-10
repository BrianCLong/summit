# Risk Enforcement

> **Method:** Manual Verification (Phase 1)
> **Cadence:** Weekly
> **Owner:** Trust Steward

## Enforcement Hook

Due to the critical nature of these risks, we employ a "Human-in-the-Loop" enforcement gate until automated tooling is fully certified.

### 1. The Weekly Sweep

**Every Monday**, the Trust Steward executes the following check:

```bash
# Check for expired risks in the register
grep -E "\| [0-9]{4}-[0-9]{2}-[0-9]{2} \|" docs/risk/RISK_REGISTER.md | \
while read line; do
  date_str=$(echo $line | awk -F'|' '{print $9}' | xargs)
  risk_id=$(echo $line | awk -F'|' '{print $2}' | xargs)
  if [[ "$date_str" < "$(date +%Y-%m-%d)" ]]; then
     echo "VIOLATION: Risk $risk_id expired on $date_str"
     # Trigger Escalation
  fi
done
```

### 2. PR Check (Manual)

**For every Release Candidate (RC) PR:**

1.  Reviewer checks `docs/risk/RISK_REGISTER.md`.
2.  If any **Active** risk has `Escalation: Block Release`, the PR is **Rejected**.
3.  If any **Accepted** risk has passed its `Latest Date`, the PR is **Rejected**.

### 3. Automated Debt Gate

The `debt/registry.json` is enforced via CI:

```bash
# Fail if new debt is added without registry entry
node scripts/ci/check_debt_regression.cjs
```

### 4. Escalation Actions

When a risk expires or an escalation trigger fires:

1.  **Block GA/Release:** The `GA_READY` flag in `docs/ga/GA_DECLARATION.md` is set to `FALSE`.
2.  **Disable Feature:** The feature flag corresponding to the risk is flipped to `OFF`.
3.  **Executive Alert:** An incident ticket is created in the high-priority queue assigned to the Owner's VP.
