# S-AOS Troubleshooting Runbook

**Version**: 1.0
**Last Updated**: 2026-03-11
**Target Audience**: Platform operators, SREs, on-call engineers

---

## Overview

This runbook provides step-by-step troubleshooting procedures for common S-AOS issues. Use this when responding to alerts, investigating failures, or debugging compliance problems.

**On-Call Priority**:
- **P0 (Critical)**: Audit trail compromised, approval service down
- **P1 (High)**: CI compliance checks blocking all merges
- **P2 (Medium)**: Individual PR compliance failures
- **P3 (Low)**: Documentation/training issues

---

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Audit Trail Issues](#audit-trail-issues)
3. [Approval Workflow Issues](#approval-workflow-issues)
4. [CI/CD Compliance Failures](#cicd-compliance-failures)
5. [Evidence Validation Errors](#evidence-validation-errors)
6. [Performance Problems](#performance-problems)
7. [Emergency Procedures](#emergency-procedures)
8. [Recovery Procedures](#recovery-procedures)

---

## Quick Diagnostics

### First Steps

When investigating any S-AOS issue, run these commands first:

```bash
# 1. Check S-AOS status
node scripts/s-aos.mjs status

# 2. Verify audit trail
node services/repoos/immutable-audit-logger.mjs verify

# 3. Run compliance checks
node scripts/verify-s-aos-compliance.mjs

# 4. Check recent actions
tail -n 50 artifacts/repoos/entropy-actions/actions.log

# 5. Check service health (if running)
ps aux | grep -E "(entropy-actuator|approval-service)"
```

### Health Check Dashboard

```bash
#!/bin/bash
# Quick health check script

echo "=== S-AOS Health Check ==="
echo ""

# Git hooks
echo "Git Hooks:"
[ -f .git/hooks/pre-commit ] && echo "  ✅ pre-commit" || echo "  ❌ pre-commit"
[ -f .git/hooks/commit-msg ] && echo "  ✅ commit-msg" || echo "  ❌ commit-msg"
echo ""

# Audit trail
echo "Audit Trail:"
if [ -f artifacts/repoos/entropy-actions/audit.json ]; then
  COUNT=$(jq 'length' artifacts/repoos/entropy-actions/audit.json)
  echo "  ✅ Exists ($COUNT entries)"

  # Verify signatures
  if node services/repoos/immutable-audit-logger.mjs verify 2>/dev/null; then
    echo "  ✅ Signatures valid"
  else
    echo "  ❌ Signatures INVALID - INVESTIGATE IMMEDIATELY"
  fi
else
  echo "  ⚠️  Not found"
fi
echo ""

# Environment
echo "Environment:"
[ -f .env ] && echo "  ✅ .env file exists" || echo "  ❌ .env file missing"
[ -n "$AUDIT_LOG_SECRET" ] && echo "  ✅ AUDIT_LOG_SECRET set" || echo "  ⚠️  AUDIT_LOG_SECRET not set"
echo ""

echo "=== End Health Check ==="
```

---

## Audit Trail Issues

### Issue: Signature Verification Fails

**Symptom**: `❌ Audit trail compromised - signature verification failed`

**Priority**: **P0 - CRITICAL**

**Impact**: Audit trail integrity cannot be verified; potential tampering or misconfiguration

#### Step 1: Identify Invalid Entries

```bash
node services/repoos/immutable-audit-logger.mjs verify
```

Output shows which entries failed:
```
❌ TAMPERING DETECTED:

  - action-20260311-103000-001 (2026-03-11T10:30:00.000Z)
    Type: notify
    Reason: Signature verification failed - entry may have been tampered with
```

#### Step 2: Investigate Cause

**Possible Causes**:

1. **AUDIT_LOG_SECRET changed** (most common)
   ```bash
   # Check if secret changed recently
   git log -p .env | grep AUDIT_LOG_SECRET
   ```

   **Fix**: Secret change invalidates all previous signatures. This is by design.
   ```bash
   # Backup old audit trail
   mv artifacts/repoos/entropy-actions/audit.json \
      artifacts/repoos/entropy-actions/audit.json.backup-$(date +%Y%m%d)

   # Start fresh
   echo "[]" > artifacts/repoos/entropy-actions/audit.json

   # Document the incident
   echo "Audit trail reset on $(date) due to secret rotation" >> \
      artifacts/repoos/entropy-actions/RESET_LOG.txt
   ```

2. **Manual edit to audit.json**
   ```bash
   # Check git history
   git log --oneline -- artifacts/repoos/entropy-actions/audit.json

   # See who modified it
   git blame artifacts/repoos/entropy-actions/audit.json
   ```

   **Fix**: Restore from backup or S3
   ```bash
   # If S3 backup exists
   aws s3 sync s3://$AUDIT_LOG_BUCKET/$(date +%Y/%m/%d)/ \
                artifacts/repoos/entropy-actions/restore/

   # Verify restored data
   AUDIT_LOG_LOCAL_DIR=artifacts/repoos/entropy-actions/restore \
     node services/repoos/immutable-audit-logger.mjs verify
   ```

3. **Filesystem corruption**
   ```bash
   # Check file integrity
   cat artifacts/repoos/entropy-actions/audit.json | jq empty

   # If JSON invalid, restore from S3 or git
   git checkout HEAD -- artifacts/repoos/entropy-actions/audit.json
   ```

#### Step 3: Escalate if Tampering Suspected

If none of the above apply, suspect actual tampering:

1. **Create incident**:
   ```bash
   gh issue create \
     --title "🚨 SECURITY: Audit trail tampering detected" \
     --label "security,critical,audit" \
     --body "Signature verification failed. See details: [link]"
   ```

2. **Notify security team**:
   ```bash
   # Slack alert
   curl -X POST $SECURITY_WEBHOOK_URL \
     -H 'Content-Type: application/json' \
     -d '{"text":"🚨 Audit trail tampering detected - immediate investigation required"}'
   ```

3. **Preserve evidence**:
   ```bash
   # Snapshot current state
   mkdir -p incident-$(date +%Y%m%d-%H%M%S)
   cp -r artifacts/repoos/entropy-actions incident-$(date +%Y%m%d-%H%M%S)/
   tar -czf incident-$(date +%Y%m%d-%H%M%S).tar.gz incident-$(date +%Y%m%d-%H%M%S)/
   ```

---

## Approval Workflow Issues

### Issue: Approval Service Not Responding

**Symptom**: Slack approval requests not appearing

**Priority**: **P1 - HIGH** (blocks high-impact actions)

**Impact**: Cannot approve entropy actions requiring human oversight

#### Step 1: Check Service Status

```bash
# Is service running?
ps aux | grep entropy-approval-service

# Check logs
tail -f logs/approval-service.log  # if logging to file

# Or run in test mode
node services/repoos/entropy-approval-service.mjs test
```

#### Step 2: Verify Slack Configuration

```bash
# Check environment variables
echo "SLACK_BOT_TOKEN: ${SLACK_BOT_TOKEN:0:10}..."  # First 10 chars only
echo "SLACK_APP_TOKEN: ${SLACK_APP_TOKEN:0:10}..."
echo "ENTROPY_APPROVAL_CHANNEL: $ENTROPY_APPROVAL_CHANNEL"

# Test Slack connection
node -e "
import { WebClient } from '@slack/web-api';
const client = new WebClient(process.env.SLACK_BOT_TOKEN);
client.auth.test()
  .then(r => console.log('✅ Slack connected:', r.user))
  .catch(e => console.error('❌ Slack error:', e.message));
"
```

**Common Issues**:

1. **Token expired**:
   - Go to https://api.slack.com/apps
   - Regenerate bot/app tokens
   - Update `.env` with new tokens
   - Restart service

2. **Bot not in channel**:
   ```bash
   # In Slack: /invite @Entropy Approvals to #entropy-approvals
   ```

3. **Socket Mode not enabled**:
   - Go to Slack app settings → Socket Mode
   - Enable Socket Mode
   - Generate new app token if needed

#### Step 3: Restart Service

```bash
# Kill existing process
pkill -f entropy-approval-service

# Start service
node services/repoos/entropy-approval-service.mjs start &

# Verify started
tail -f logs/approval-service.log

# Should see: "⚡️ Slack approval service connected"
```

### Issue: Approval Requests Timing Out

**Symptom**: Actions auto-denied after 15 minutes

**Priority**: **P2 - MEDIUM**

**Impact**: Valid actions being rejected due to timeout

#### Step 1: Check Timeout Configuration

```bash
echo "Current timeout: $ENTROPY_APPROVAL_TIMEOUT ms"
echo "That's $(($ENTROPY_APPROVAL_TIMEOUT / 60000)) minutes"
```

#### Step 2: Increase Timeout (if appropriate)

```bash
# Edit .env
ENTROPY_APPROVAL_TIMEOUT=1800000  # 30 minutes

# Restart approval service
pkill -f entropy-approval-service
node services/repoos/entropy-approval-service.mjs start &
```

#### Step 3: Notify Approvers

```bash
# Post to Slack manually
curl -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"channel\": \"$ENTROPY_APPROVAL_CHANNEL\",
    \"text\": \"⚠️ Multiple approval requests have timed out. Please check #entropy-approvals regularly.\"
  }"
```

---

## CI/CD Compliance Failures

### Issue: All PRs Failing Compliance Checks

**Symptom**: CI workflow `s-aos-compliance` failing on all PRs

**Priority**: **P1 - HIGH** (blocks all development)

**Impact**: Cannot merge any PRs

#### Step 1: Check CI Logs

```bash
# View recent workflow runs
gh run list --workflow=s-aos-compliance.yml --limit=5

# View specific run
gh run view <run-id> --log
```

#### Step 2: Identify Common Failure

**Scenario A: Schema validation failing**

```
❌ Schema validation failed
Error: /reportId is required
```

**Fix**: Update schema or example
```bash
# Validate schemas locally
ajv validate -s schemas/evidence/entropy-report.schema.json \
              -d artifacts/repoos/frontier-entropy/report.json

# If schema is wrong, update it
# If report is wrong, regenerate evidence
```

**Scenario B: Audit trail verification failing**

```
❌ Audit trail signature verification failed
```

**Fix**: See [Audit Trail Issues](#audit-trail-issues)

**Scenario C: Missing environment secrets**

```
Error: AUDIT_LOG_SECRET not set
```

**Fix**: Configure GitHub secrets
```bash
# Add secrets in GitHub Settings → Secrets → Actions
# - AUDIT_LOG_SECRET
# - AUDIT_LOG_BUCKET (optional)
# - AWS_REGION (optional)
```

#### Step 3: Temporary Bypass (Emergency Only)

If CI is blocking critical fixes:

```bash
# Disable workflow temporarily
mv .github/workflows/s-aos-compliance.yml \
   .github/workflows/s-aos-compliance.yml.disabled

# Merge critical fixes
# ...

# Re-enable workflow
mv .github/workflows/s-aos-compliance.yml.disabled \
   .github/workflows/s-aos-compliance.yml

# Document why bypass was needed
gh issue create \
  --title "CI Bypass: S-AOS compliance disabled temporarily" \
  --label "incident,post-mortem-required" \
  --body "Reason: [explain]"
```

### Issue: Individual PR Failing Commit Message Validation

**Symptom**: PR fails with commit message errors

**Priority**: **P2 - MEDIUM**

**Impact**: Single PR blocked

#### Step 1: Check Commit Messages

```bash
# View commits in PR
gh pr view <pr-number> --json commits | jq '.commits[].commit.message'
```

#### Step 2: Guide Developer to Fix

**Option A: Amend last commit** (if not pushed)
```bash
git commit --amend
# Edit message to comply with S-AOS format
```

**Option B: Interactive rebase** (if pushed)
```bash
git rebase -i main
# Change 'pick' to 'reword' for commits to fix
# Edit commit messages
git push --force-with-lease
```

**Option C: Squash and recommit**
```bash
git reset --soft main
git commit
# Write new S-AOS compliant message
git push --force-with-lease
```

#### Step 3: Provide Template

```bash
# Generate template for developer
node scripts/s-aos.mjs template feat <scope>

# Send to developer via PR comment
```

---

## Evidence Validation Errors

### Issue: Evidence Artifact Schema Validation Fails

**Symptom**: `❌ Evidence artifact missing required fields`

**Priority**: **P2 - MEDIUM**

**Impact**: PR cannot be merged

#### Step 1: Identify Missing Fields

```bash
# Validate locally
ajv validate -s schemas/evidence/entropy-report.schema.json \
              -d artifacts/repoos/frontier-entropy/report.json

# Output shows which fields are missing:
# /reportId is required
# /timestamp is required
```

#### Step 2: Check Report Generation

```bash
# Regenerate evidence with verbose logging
DEBUG=1 node scripts/entropy-monitor.mjs

# Inspect output
cat artifacts/repoos/frontier-entropy/report.json | jq '.'
```

#### Step 3: Fix Report Generator

Common issues:

1. **Missing required field**: Update generator to include field
2. **Wrong field type**: Fix type conversion (e.g., number vs string)
3. **Invalid enum value**: Use valid enum from schema

```javascript
// Example fix
const report = {
  reportId: `entropy-${Date.now()}`,  // ✅ Add missing field
  timestamp: new Date().toISOString(),  // ✅ ISO format
  version: "1.0",  // ✅ Required
  evidenceType: "entropy-analysis",  // ✅ Required
  // ...
};
```

---

## Performance Problems

### Issue: Audit Logging Slow

**Symptom**: Actions taking > 5s to log

**Priority**: **P3 - LOW** (but monitor)

**Impact**: Degraded user experience

#### Step 1: Measure Performance

```bash
# Run performance benchmark
node services/repoos/__tests__/s-aos-integration.test.mjs

# Or create quick benchmark
time node services/repoos/immutable-audit-logger.mjs test
```

#### Step 2: Check S3 Latency

If S3 is configured:

```bash
# Measure S3 upload time
time aws s3 cp /tmp/test.json s3://$AUDIT_LOG_BUCKET/test/

# Expected: < 500ms
# If > 2s, investigate:
# - S3 region mismatch (use same region as service)
# - Network issues
# - IAM permissions (may be hitting rate limits)
```

#### Step 3: Optimize

**Option A: Disable S3 temporarily**
```bash
# In .env, comment out:
# AUDIT_LOG_BUCKET=

# Restart service - will use local filesystem only
```

**Option B: Batch uploads**
```javascript
// Instead of uploading each entry individually,
// batch every N entries or every T seconds
const batchSize = 10;
const entries = [];

function logAction(entry) {
  entries.push(entry);

  if (entries.length >= batchSize) {
    uploadBatch(entries);
    entries.length = 0;
  }
}
```

---

## Emergency Procedures

### Emergency: Stop All Entropy Actuation

**When to use**: Runaway actuator, incorrect predictions causing harm

**Impact**: All automation stops immediately

```bash
# 1. Kill actuator process
pkill -9 -f entropy-actuator

# 2. Disable in environment
echo "ENTROPY_ACTUATION_ENABLED=false" >> .env
echo "DRY_RUN=true" >> .env

# 3. Verify stopped
ps aux | grep entropy-actuator
# Should return nothing

# 4. Create incident
gh issue create \
  --title "EMERGENCY: Entropy actuation stopped" \
  --label "critical,incident" \
  --body "Reason: [explain]\nStopped at: $(date)\nBy: $(whoami)"

# 5. Notify team
# Post to Slack #incidents channel
```

### Emergency: Rollback S-AOS Deployment

**When to use**: Critical production impact, need to revert quickly

```bash
# 1. Disable CI workflows
mv .github/workflows/s-aos-compliance.yml \
   .github/workflows/s-aos-compliance.yml.disabled

mv .github/workflows/audit-health-check.yml \
   .github/workflows/audit-health-check.yml.disabled

# 2. Remove git hooks
rm .git/hooks/pre-commit
rm .git/hooks/commit-msg

# 3. Unset git template
git config --local --unset commit.template

# 4. Stop services
pkill -f entropy-actuator
pkill -f entropy-approval-service

# 5. Document rollback
git add .github/workflows/*.disabled
git commit -m "emergency: rollback S-AOS deployment

Reason: [explain]
Impact: [describe]
Duration: [how long S-AOS was active]

Rollback checklist:
- [x] Disabled CI workflows
- [x] Removed git hooks
- [x] Stopped services
- [ ] Post-mortem scheduled
- [ ] Root cause analysis
"

# 6. Create post-mortem
gh issue create \
  --title "Post-Mortem: S-AOS Rollback on $(date +%Y-%m-%d)" \
  --label "post-mortem,critical" \
  --assignee "@platform-lead"
```

---

## Recovery Procedures

### Recovery: Restore Audit Trail from S3

**When to use**: Local audit trail corrupted, need to restore from immutable storage

```bash
# 1. Backup corrupted local copy
mv artifacts/repoos/entropy-actions/audit.json \
   artifacts/repoos/entropy-actions/audit.json.corrupted-$(date +%Y%m%d)

# 2. Download from S3
# Option A: Download latest
aws s3 ls s3://$AUDIT_LOG_BUCKET/ --recursive | tail -1
LATEST_KEY=$(aws s3 ls s3://$AUDIT_LOG_BUCKET/ --recursive | tail -1 | awk '{print $4}')
aws s3 cp "s3://$AUDIT_LOG_BUCKET/$LATEST_KEY" /tmp/latest-audit-entry.json

# Option B: Download all and reconstruct
mkdir -p /tmp/audit-restore
aws s3 sync s3://$AUDIT_LOG_BUCKET/ /tmp/audit-restore/

# Reconstruct audit.json from all entries
jq -s '.' /tmp/audit-restore/**/*.json > artifacts/repoos/entropy-actions/audit.json

# 3. Verify restored audit trail
node services/repoos/immutable-audit-logger.mjs verify

# Should see: ✅ All signatures valid

# 4. Document recovery
echo "Audit trail restored from S3 on $(date)" >> \
  artifacts/repoos/entropy-actions/RECOVERY_LOG.txt
```

### Recovery: Regenerate Signing Secret

**When to use**: Secret compromised, need to rotate

**WARNING**: This invalidates ALL previous audit signatures

```bash
# 1. Backup existing audit trail
mkdir -p backups/audit-$(date +%Y%m%d)
cp -r artifacts/repoos/entropy-actions/* backups/audit-$(date +%Y%m%d)/

# 2. Generate new secret
NEW_SECRET=$(openssl rand -base64 48)  # 48 bytes for extra security

# 3. Update .env
echo "AUDIT_LOG_SECRET=$NEW_SECRET" >> .env.new
echo "# Previous secret rotated on $(date)" >> .env.new
cat .env >> .env.new
mv .env .env.old
mv .env.new .env

# 4. Reset audit trail
echo "[]" > artifacts/repoos/entropy-actions/audit.json

# 5. Document rotation
echo "Secret rotated on $(date) - all previous signatures invalidated" > \
  backups/audit-$(date +%Y%m%d)/README.txt

# 6. Restart services
pkill -f entropy-actuator
pkill -f entropy-approval-service

node services/repoos/entropy-actuator.mjs &
node services/repoos/entropy-approval-service.mjs start &

# 7. Notify team
gh issue create \
  --title "Security: Audit log secret rotated" \
  --label "security,audit" \
  --body "Secret rotated on $(date). Previous audit trail archived to backups/audit-$(date +%Y%m%d)/"
```

---

## Escalation Path

### Level 1: On-Call Engineer
- **Handles**: P2-P3 issues, standard troubleshooting
- **Contact**: Slack #on-call

### Level 2: Platform Lead
- **Handles**: P1 issues, CI/CD outages, approval workflow failures
- **Contact**: @platform-lead (Slack), platform-lead@company.com

### Level 3: Security Team
- **Handles**: P0 issues, audit trail tampering, security incidents
- **Contact**: @security-oncall (PagerDuty), security@company.com

### Emergency Contacts
- **CTO**: For business-critical escalations
- **Legal**: For compliance/regulatory issues related to audit trail

---

## Reference

### Log Locations
```
artifacts/repoos/entropy-actions/audit.json      - Audit trail
artifacts/repoos/entropy-actions/actions.log     - Human-readable log
logs/approval-service.log                        - Approval service logs
logs/audit-health.log                            - Health check logs (cron)
```

### Configuration Files
```
.env                          - Environment variables
config/entropy-policy.json    - Actuation policy
.gitmessage                   - Commit template
.git/hooks/*                  - Git hooks
```

### Key Scripts
```
scripts/s-aos.mjs                              - CLI tool
scripts/verify-s-aos-compliance.mjs            - Compliance checks
scripts/deploy-s-aos-improvements.sh           - Deployment
services/repoos/immutable-audit-logger.mjs     - Audit logger
services/repoos/entropy-approval-service.mjs   - Approval service
```

---

**Last Updated**: 2026-03-11
**Version**: 1.0
**Maintainer**: Platform Architecture Team
**On-Call Runbook**: Print and keep accessible for incident response
