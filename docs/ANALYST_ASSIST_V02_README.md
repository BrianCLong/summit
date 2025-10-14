# Analyst Assist v0.2 - Policy-Aware Intelligence Analysis

**Issue**: #10067
**Owner**: Frontend + Design
**Due**: 2025-10-17
**Status**: ✅ COMPLETE

## Overview

Analyst Assist v0.2 provides intelligence analysts with a policy-aware interface for querying, analyzing, and exporting data. The system integrates OPA policy evaluation, explainable AI, and step-up authentication to ensure secure and compliant operations.

## Components Delivered

### 1. Query Builder UX (`QueryBuilder.tsx`)

Interactive query builder with:
- Multi-condition queries (field, operator, value)
- Dynamic condition management (add/remove)
- Real-time policy preview
- Export policy checking

**Features**:
- Field options: Entity Type, Classification, Relationship Type, Timestamp, Confidence
- Operators: Equals, Contains, Greater Than, Less Than
- Policy preview before export
- DLP violation detection

### 2. Explainability Panel (`ExplainabilityPanel.tsx`)

"Why blocked?" explanations with:
- Policy outcome display (allow/deny)
- Rule ID and evidence
- Remediation instructions
- AI-powered explanations
- Expandable detail views

**Features**:
- Clear blocked/allowed indicators
- Evidence list with context
- Remediation steps
- AI explanation generation
- Query context display

### 3. Export Request (`ExportRequest.tsx`)

Policy-aware export interface with:
- Multiple export formats (JSON, CSV, GraphML, PDF)
- Provenance and metadata options
- Pre-export policy check
- Step-up authentication trigger
- Policy impact preview

**Features**:
- Format selection with preview
- Policy check before export
- Step-up authentication integration
- Download handling
- Policy explanation display

### 4. Main Component (`AnalystAssist.tsx`)

Integrated interface with:
- Tabbed navigation (Query, Export, Help)
- Comprehensive help documentation
- Acceptance criteria verification
- Audit logging footer

### 5. Backend Endpoints (`policy-preview.js`)

API routes supporting:
- `/api/policy/preview-export` - Preview query export policy
- `/api/export/policy-check` - Check export permissions
- `/api/policy/explain` - Generate AI explanations

**Features**:
- OPA integration for policy evaluation
- Step-up token validation
- DLP violation detection
- Rule-based explanation generation

### 6. E2E Tests (`analyst-assist-demo.spec.js`)

Comprehensive test suite covering:
- Blocked export flow
- Allowed export with step-up
- Policy explanations
- All 5 acceptance criteria

## Acceptance Criteria

### ✅ 1. Query Builder UX
- [x] Multi-condition query builder
- [x] Field/operator/value selectors
- [x] Add/remove conditions
- [x] Execute query button
- [x] Policy preview button

### ✅ 2. "Why Blocked?" Explanations Wired to Policy Outcomes
- [x] Policy decision display (allow/deny)
- [x] Reason and rule ID shown
- [x] Evidence list displayed
- [x] Remediation instructions
- [x] AI-powered plain language explanations

### ✅ 3. Export Request Previews Policy Impact
- [x] Pre-export policy check
- [x] Format selection (JSON, CSV, GraphML, PDF)
- [x] Provenance/metadata options
- [x] Policy preview before execution
- [x] Step-up authentication trigger

### ✅ 4. Demo Walkthrough: Assist → Explain → Export
- [x] Build query in Query Builder
- [x] Preview policy outcome
- [x] View explanations
- [x] Attempt export
- [x] Handle blocked/allowed per policy

### ✅ 5. Blocked/Allowed Decisions Shown Per Policy
- [x] Clear visual indicators (✅/🚫)
- [x] Policy-specific reasons
- [x] Evidence and context
- [x] Remediation paths

## Usage

### Starting the Application

```bash
# Start backend with OPA integration
cd backend
npm install
OPA_URL=http://localhost:8181 npm start

# Start frontend
cd conductor-ui/frontend
npm install
npm run dev
```

### Demo Walkthrough

1. **Navigate to Analyst Assist**
   - Go to `/analyst-assist`
   - See tabbed interface: Query Builder | Export Data | Help

2. **Build Query**
   - Select field: "Entity Classification"
   - Select operator: "Equals"
   - Enter value: "TOP_SECRET"
   - Click "Preview Export Policy"

3. **View Explanation**
   - See policy outcome: Blocked/Allowed
   - Read "Why blocked?" explanation
   - View rule ID, evidence, remediation
   - Expand details for full context

4. **Attempt Export**
   - Go to "Export Data" tab
   - Select format: JSON
   - Check "Include Provenance"
   - Click "Check Export Policy"
   - See policy result
   - If blocked: View explanation
   - If step-up required: Click "🔐 Authenticate to Export"
   - If allowed: Click "Execute Export"

## Policy Integration

### OPA Policy Endpoints

```rego
# Export allow policy
package export

default allow = false

allow {
    input.user == "authorized_analyst"
    input.stepUpToken != null
    input.resource.classification == "UNCLASSIFIED"
}

stepup_required {
    input.resource.classification != "UNCLASSIFIED"
}
```

### API Flow

1. **Policy Preview**:
   ```
   POST /api/policy/preview-export
   → OPA evaluation
   → Return: { allowed, reason, requiredStepUp, dlpViolations }
   ```

2. **Export Policy Check**:
   ```
   POST /api/export/policy-check
   → OPA evaluation with step-up token
   → Return: { outcome, requiresStepUp }
   ```

3. **Explanation Generation**:
   ```
   POST /api/policy/explain
   → Rule-based explanation
   → Return: { explanation }
   ```

## Testing

### Run E2E Tests

```bash
# Run Analyst Assist demo tests
npx playwright test tests/e2e/analyst-assist-demo.spec.js

# Run with UI
npx playwright test tests/e2e/analyst-assist-demo.spec.js --ui
```

### Manual Testing

1. **Blocked Scenario**:
   - Query: classification = "TOP_SECRET"
   - Expected: Export blocked, explanation shown

2. **Step-Up Scenario**:
   - Query: classification = "SECRET"
   - Expected: Step-up required, authenticate button shown

3. **Allowed Scenario**:
   - Query: classification = "UNCLASSIFIED"
   - Expected: Export allowed, execute button shown

## Architecture

```
conductor-ui/frontend/src/components/
├── analyst/
│   ├── AnalystAssist.tsx       # Main component
│   ├── QueryBuilder.tsx         # Query builder UI
│   ├── ExplainabilityPanel.tsx  # Policy explanations
│   └── ExportRequest.tsx        # Export with policy check
└── ui/
    └── alert.tsx                # Alert components

backend/routes/
└── policy-preview.js            # Policy API endpoints

tests/e2e/
└── analyst-assist-demo.spec.js  # E2E tests
```

## Files Delivered

1. `conductor-ui/frontend/src/components/analyst/AnalystAssist.tsx` (135 lines)
2. `conductor-ui/frontend/src/components/analyst/QueryBuilder.tsx` (180 lines)
3. `conductor-ui/frontend/src/components/analyst/ExplainabilityPanel.tsx` (145 lines)
4. `conductor-ui/frontend/src/components/analyst/ExportRequest.tsx` (195 lines)
5. `conductor-ui/frontend/src/components/ui/alert.tsx` (20 lines)
6. `backend/routes/policy-preview.js` (160 lines)
7. `tests/e2e/analyst-assist-demo.spec.js` (200 lines)
8. `docs/ANALYST_ASSIST_V02_README.md` (this file)

**Total**: 8 files, ~1,035 lines of code + documentation

## Next Steps

1. Deploy to staging environment
2. Run full E2E test suite
3. Conduct user acceptance testing
4. Monitor policy evaluation performance
5. Collect analyst feedback for v0.3

## Related Issues

- #10064 - WebAuthn Step-Up + DLP Policies (dependency)
- #10065 - Golden-Path E2E CI Job (testing)
- #10066 - Alerts + Trace Exemplars (monitoring)

---

**Status**: ✅ Ready for UAT
**Acceptance Criteria**: 5/5 Complete
**Due Date**: 2025-10-17 (On Track)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
