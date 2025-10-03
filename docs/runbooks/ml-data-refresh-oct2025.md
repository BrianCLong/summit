# ML Data Refresh & Precision Gate — October 2025

**Target:** Complete before October 20, 2025
**Owner:** ML/AI Team Lead
**Tracking:** Part of EO-5 (Oct-Nov 2025 Delivery)

## Overview
Refresh entity resolution training data, run precision gate validation, and publish updated model card to ensure ML models meet quality thresholds for Halloween release.

## Prerequisites
- Access to labeling/annotation tools
- GitHub Actions workflow permissions
- Prometheus/metrics dashboard access

## Step 1: Data Refresh & Provenance

### 1.1 Generate Dataset Hash
```bash
DATASET_DATE=$(date -u +%Y%m%d)
# After refreshing your dataset, compute hash:
DATASET_HASH=$(shasum -a 256 data/training/er_${DATASET_DATE}.parquet | cut -d' ' -f1)

# Record for traceability
echo "Dataset: er_${DATASET_DATE}"
echo "SHA256: ${DATASET_HASH}"
```

### 1.2 Configure Workflow Variables
Add to GitHub repository secrets/variables:
```bash
gh variable set ML_DATASET_DATE --body "$DATASET_DATE"
gh variable set ML_DATASET_HASH --body "$DATASET_HASH"
```

## Step 2: Kick Off Labeling/Import Sprint

### 2.1 Dispatch Training Workflow
```bash
# If you have entity-resolution-train.yml or similar:
gh workflow run entity-resolution-train.yml \
  --ref main \
  -f dataset_date="$DATASET_DATE" \
  -f dataset_hash="$DATASET_HASH" \
  -f sample_size="10000" \
  -f seed="42"
```

### 2.2 Monitor Training Progress
```bash
# List recent runs
gh run list --workflow entity-resolution-train.yml --limit 5

# Watch specific run
TRAIN_RUN_ID=$(gh run list --workflow entity-resolution-train.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch $TRAIN_RUN_ID
```

### 2.3 Download Training Artifacts
```bash
# Once complete, fetch model artifacts
gh run download $TRAIN_RUN_ID --name er-model-${DATASET_DATE}

# Verify checksum
shasum -a 256 -c checksums.txt
```

## Step 3: Run Precision Gate

### 3.1 Dispatch Precision Gate Workflow
```bash
gh workflow run er-precision-gate.yml \
  --ref main \
  -f dataset_hash="$DATASET_HASH" \
  -f min_precision="0.92" \
  -f min_recall="0.88" \
  -f min_f1="0.90"
```

### 3.2 Check Gate Status
```bash
GATE_RUN_ID=$(gh run list --workflow er-precision-gate.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch $GATE_RUN_ID

# View results
gh run view $GATE_RUN_ID --log
```

### 3.3 Gate Outcomes
- ✅ **PASS**: Precision/Recall/F1 meet thresholds → proceed to model card
- ❌ **FAIL**: Investigate low metrics → retrain or adjust data

## Step 4: Publish Model Card

### 4.1 Generate Model Card
```bash
cat > model_cards/er_${DATASET_DATE}.md << EOF
# Entity Resolution Model Card — ${DATASET_DATE}

## Model Details
- **Model ID:** \`er_${DATASET_DATE}\`
- **Dataset Hash:** \`${DATASET_HASH}\`
- **Training Date:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Framework:** [PyTorch/TensorFlow/Scikit-learn]
- **Architecture:** [Model architecture description]

## Performance Metrics
| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Precision | XX.X% | ≥92% | [✅/❌] |
| Recall | XX.X% | ≥88% | [✅/❌] |
| F1 Score | XX.X% | ≥90% | [✅/❌] |

## Dataset
- **Source:** [Internal/Partner data]
- **Sample Size:** 10,000 labeled examples
- **Sampling Method:** Stratified random sampling
- **Label Quality:** [Inter-annotator agreement score]

## Known Limitations
- [Limitation 1: e.g., Performance degrades on entity names with special characters]
- [Limitation 2: e.g., Recall lower for rare entity types]
- [Limitation 3: e.g., Not tested on multi-lingual data]

## Changes from Previous Version
- **Previous Model:** \`er_YYYYMMDD\`
- **Diff Summary:**
  - Precision: +X.X%
  - Recall: +X.X%
  - New training features: [list]
  - Data quality improvements: [list]

## Ethical Considerations
- [Privacy safeguards]
- [Bias mitigation steps]
- [Fairness evaluation results]

## Deployment
- **Status:** ✅ Approved for production
- **Deployment Date:** [Target date]
- **Rollback Plan:** [Link to rollback runbook]

## Provenance
- **Training Run:** https://github.com/BrianCLong/summit/actions/runs/${TRAIN_RUN_ID}
- **Precision Gate:** https://github.com/BrianCLong/summit/actions/runs/${GATE_RUN_ID}
- **Artifact SHA256:** ${DATASET_HASH}

---
*Model card generated $(date -u +%Y-%m-%d) as part of EO-5 (Oct-Nov 2025 Delivery)*
EOF
```

### 4.2 Commit & Push
```bash
git add model_cards/er_${DATASET_DATE}.md
git commit -m "feat(ml): add model card for ER ${DATASET_DATE}

- Precision: XX.X%
- Recall: XX.X%
- F1: XX.X%
- Dataset hash: ${DATASET_HASH}

Part of EO-5: ML data refresh before Oct 20, 2025

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main
```

## Step 5: Update Dashboard

### 5.1 Add Model Performance Panel
Update Grafana dashboard with:
- Precision/Recall/F1 time-series
- Dataset version selector
- Training/inference latency metrics

### 5.2 Link to Project Board
Add model card link to relevant Project #8 issues:
```bash
gh issue comment <ISSUE_NUMBER> --body "✅ ML data refreshed. Model card: [er_${DATASET_DATE}](../model_cards/er_${DATASET_DATE}.md)"
```

## Step 6: Gate Merge/Deploy (Optional)

### 6.1 Required Status Check
Ensure `er-precision-gate.yml` is configured as a required check:
```bash
gh api repos/BrianCLong/summit/branches/main/protection \
  --method PUT \
  -f required_status_checks='{"strict":true,"contexts":["ER Precision Gate"]}'
```

### 6.2 Model Deploy Workflow
Only trigger model deployment if gate passes:
```yaml
# In .github/workflows/model-deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: [precision-gate]
    if: needs.precision-gate.result == 'success'
    steps:
      # ... deployment steps
```

## Acceptance Criteria
- ✅ Dataset refreshed with provenance hash
- ✅ Training workflow completed successfully
- ✅ Precision gate PASSED (all metrics ≥ thresholds)
- ✅ Model card published and committed
- ✅ Dashboard updated with new model metrics
- ✅ Project board issues linked to model card

## Troubleshooting

### Gate Fails: Low Precision
- Review false positives in validation set
- Increase decision threshold
- Add more negative examples to training data

### Gate Fails: Low Recall
- Review false negatives in validation set
- Decrease decision threshold
- Add more diverse positive examples

### Training Timeout
- Reduce sample size
- Optimize hyperparameters
- Request larger runner

---
**Timeline:** Complete by October 20, 2025
**Next Review:** Post-Halloween retrospective (Nov 3-7)
