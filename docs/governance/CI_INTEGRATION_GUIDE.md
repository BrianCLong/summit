# Summit CI/CD Integration Guide

This document explains how the Project 19 governance fields integrate with existing Summit CI/CD artifacts and processes.

## Mapping: Governance Fields ↔ CI Artifacts

### CI Health & Determinism Fields

| Project Field | CI Artifact Source | Artifact Path | Extraction Method |
|---------------|-------------------|---------------|-------------------|
| **CI Status Snapshot** | Workflow conclusion | `workflow_run.conclusion` | `"success" → "Green", "failure" → "Failing", "cancelled" → "Failing"` |
| **Determinism Risk** | Determinism analysis report | `artifacts/determinism-report.json` | `report.determinism_risk` |
| **Test Coverage Delta** | Coverage artifact | `artifacts/coverage-summary.json` | `summary.delta_percent` |
| **Artifact Produced** | Build completion | `artifacts/build-success.json` | `"exists" → "Yes", "missing" → "No"` |
| **Policy Version** | Stamp artifact | `artifacts/stamp.json` | `stamp.policy_version` |

### Evidence & Compliance Fields

| Project Field | CI Artifact Source | Artifact Path | Extraction Method |
|---------------|-------------------|---------------|-------------------|
| **Evidence Bundle ID** | Evidence bundle | `artifacts/evidence-bundle/*.json` | `bundle.metadata.bundle_id` |
| **Evidence Complete** | Verification report | `artifacts/verification-report.json` | `report.evidence_complete` |
| **Audit Criticality** | Security scan | `artifacts/security-results.json` | `results.audit_criticality` |
| **External Audit Scope** | Compliance check | `artifacts/compliance-results.json` | `results.external_audit_scope` |
| **Control Mapping** | Framework mapping | `artifacts/framework-coverage.json` | `frameworks` |

### Release Control Fields

| Project Field | CI Artifact Source | Artifact Path | Extraction Method |
|---------------|-------------------|---------------|-------------------|
| **Release Train** | Release workflow | `workflow_run.name` | `"ga-verify" → "GA", "mvp4-release" → "MVP-4"` |
| **Release Blocker** | Gate verification | `artifacts/ga-gate-results.json` | `results.gate_status === "BLOCKER"` |
| **Rollback Required** | Deployment report | `artifacts/deployment-report.json` | `report.rollback_required` |
| **Kill-Switch Available** | Feature flags | `artifacts/feature-flag-config.json` | `features.kill_switch_available` |

### Agent Automation Fields

| Project Field | Agent Artifact Source | Artifact Path | Extraction Method |
|---------------|----------------------|---------------|-------------------|
| **Primary Agent** | Agent execution log | `artifacts/agent-log.json` | `log.primary_agent` |
| **Agent Output Determinism** | Agent output analysis | `artifacts/agent-determinism.json` | `analysis.determinism_classification` |
| **Agent Prompt ID** | Agent execution context | `artifacts/agent-context.json` | `context.prompt_id` |
| **Prompt Version** | Agent execution context | `artifacts/agent-context.json` | `context.prompt_version` |
| **Max Fix Scope** | Agent safety config | `artifacts/agent-safety.json` | `config.max_fix_scope` |

## Integration Implementation

### 1. CI Workflow Modification

Add to relevant workflows in `.github/workflows/`:

```yaml
# Example: Core CI workflow
name: CI Core
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # ... existing steps ...
      
      # New: Generate governance stamp
      - name: Generate governance stamp
        run: |
          # Create stamp with governance-relevant signals
          echo "{
            \"status\": \"${{ job.status }}\",
            \"determinism_risk\": \"$(determine_risk_level)\",
            \"policy_version\": \"${{ vars.POLICY_VERSION || 'v2026.01.15' }}\",
            \"evidence_bundle_id\": \"$(get_evidence_bundle_id)\",
            \"evidence_complete\": ${{ steps.verify-evidence.outputs.complete || 'false' }}
          }" > stamp.json
          
      # New: Upload governance artifacts
      - name: Upload governance artifacts
        uses: actions/upload-artifact@v4
        with:
          name: governance-stamp
          path: stamp.json
          
      # New: Process for Project 19
      - name: Update Project 19 fields
        if: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PROJECT19_NUMBER: ${{ vars.PROJECT19_NUMBER || '19' }}
        run: |
          npm run process:ci-signals -- --workflow-run="${{ github.run_id }}"
```

### 2. Evidence Collection Integration

Update evidence generation scripts to output compatible data:

```javascript
// In evidence generation scripts: scripts/evidence/generate_*.js
function generateControlItemEvidence(itemId, control) {
  return {
    // ... existing evidence fields ...
    
    // New governance fields
    project_item_id: itemId,  // Links to Project 19 item
    governance_signals: {
      audit_criticality: control.classification || "Informational",
      external_audit_scope: control.in_external_audit_scope || false,
      evidence_complete: control.verification_status === "completed",
      evidence_bundle_id: control.bundle_identifier,
      control_mapping: control.frameworks || []
    }
  };
}
```

### 3. Gate Verification Integration

Update gate verification to provide governance signals:

```javascript
// In scripts/ga/ga-verify-runner.mjs
async function verifyGAGates() {
  const gateResults = {
    // ... existing results ...
    
    // New governance signals
    governance_signals: {
      gate_status: computeAggregateStatus(),
      evidence_complete: allEvidencePresent(),
      ci_status_snapshot: getCiHealth(),
      determinism_risk: getDeterminismRisk(),
      release_blocker: hasReleaseBlockingIssues()
    }
  };
  
  // Write governance signals to artifact
  await fs.writeFile('ga-governance-signals.json', JSON.stringify(gateResults, null, 2));
}
```

### 4. Agent Execution Integration

Update agent execution wrapper to provide governance signals:

```javascript
// In agent execution scripts
async function executeAgentTask(task) {
  const executionSignals = {
    // ... agent execution details ...
    
    // New governance fields
    governance_signals: {
      primary_agent: task.agent_name,
      agent_prompt_id: task.prompt_id,
      prompt_version: task.prompt_version,
      agent_output_determinism: await analyzeOutputDeterminism(result),
      max_fix_scope: task.max_scope,
      human_approval_required: task.requires_approval,
      dry_run_supported: task.supports_dry_run,
      auto_merge_allowed: task.auto_merge_enabled,
      execution_confidence: computeExecutionConfidence(result, task)
    }
  };
  
  // Write governance signals to artifact
  await fs.writeFile(`agent-governance-${task.id}.json`, JSON.stringify(executionSignals, null, 2));
}
```

## Verification: No Duplication Contract

The system follows the "no duplication" principle:

### ✅ CORRECT (Pointer pattern)
- **Project stores:** "Evidence Complete: Yes", "Bundle ID: abc123def"
- **CI stores:** Full evidence content in `artifacts/evidence-bundle/abc123def/`

### ❌ INCORRECT (Duplication pattern) 
- **Project stores:** "Evidence Complete: Yes", "Evidence Content: [FULL EVIDENCE TEXT]"
- **CI stores:** Full evidence content

## Automated Linking Heuristic

To automatically link CI artifacts to Project items, use these patterns:

1. **Commit SHA correlation**: Link workflow runs to issues/PRs that modified the same files
2. **Branch naming**: Parse issue numbers from branch names (`feature/issue-123-...`)
3. **PR/Issue references**: Look for `#123` references in commit messages or PR descriptions
4. **Artifact metadata**: Include Project item IDs in artifact metadata when possible

## Safety Valves

1. **Artifact validation**: All artifacts are validated against schema before processing
2. **Max updates per run**: Limits prevent runaway field updates
3. **Dry-run by default**: All operations run dry first
4. **Computed field protection**: Prevents manual overrides to automatically calculated fields

## Migration Strategy

### Phase 1: Dual Write
- Continue existing CI/CD processes
- Write governance signals alongside without affecting existing flows

### Phase 2: Integration Validation  
- Verify artifact → field mappings match expectations
- Fine-tune extraction logic

### Phase 3: Activation
- Enable Project field updates from CI signals
- Validate that governance metrics update correctly

## Troubleshooting

### Debugging CI → Project Field Mapping
1. Check artifacts exist: `gh run download <run-id> --name governance-stamp`
2. Verify field mapping: `cat stamp.json | jq '.field_mapping'`
3. Confirm project item linkage: Check if PR/issue numbers match

### Common Issues
- **Missing artifacts**: Ensure upload steps run even on failure
- **Incorrect linkage**: Verify branch naming conventions and commit messages
- **Permission issues**: Ensure `GITHUB_TOKEN` has project write permissions

## Monitoring

### Key Metrics
1. **Artifact availability**: % of workflow runs producing required artifacts
2. **Field update success rate**: % of governance signal updates that succeed
3. **Linkage accuracy**: % of CI runs correctly linked to Project items
4. **Drift detection**: Deviations between CI state and Project fields

### Alerts
- **Critical**: No governance artifacts from core workflows for > 24 hours
- **Warning**: Field update failure rate > 5%
- **Info**: New workflow without governance integration detected

This integration ensures that CI/CD signals automatically update Project fields without duplicating information, maintaining the "single source of truth" principle.