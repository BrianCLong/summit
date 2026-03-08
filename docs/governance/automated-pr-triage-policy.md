# Document

## PR Classification Rules

### 🔴 Blocker (Auto-hold)

* Touches CI workflows
* Alters governance or policy enforcement
* Modifies run manifest logic
* Introduces new external dependencies

### 🟠 High Risk

* Cross-module changes
* Database schema changes
* Redis/runtime changes
* Performance-sensitive code paths

### 🟢 Low Risk (Fast-Track Eligible)

* Docs
* Tests only
* Lint/formatting
* Isolated module with passing MBV

---

## Auto-Triage Workflow

### Step 1 — Labeling

Bot assigns:

* `risk:blocker`
* `risk:high`
* `risk:low`

### Step 2 — Required Checks

| Risk    | Required Checks       |
| ------- | --------------------- |
| Blocker | Full CI + Jules sweep |
| High    | CI + MBV              |
| Low     | CI only               |

### Step 3 — Merge Rules

* Low risk → auto-merge when green
* High risk → require 1 human review
* Blocker → require 2 reviews + Jules PASS

---

## CI Saturation Protection Rule

If queue depth > 300:

* Pause auto-merge
* Allow only blocker fixes
* Notify Observer
