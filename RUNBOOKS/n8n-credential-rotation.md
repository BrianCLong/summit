# n8n Credential Rotation Runbook

**Created:** 2026-02-06
**Owner:** DevOps / Security Team
**Priority:** P0 (per threat-intel-backlog-2026-01-22.md)

## Background

Per SEC-OPS-001 in the threat intelligence backlog, all n8n credentials must be rotated following the CVE-2026-21858 (n8n RCE vulnerability) disclosure. Even with version gates in place, credentials that may have been exposed should be rotated as a defensive measure.

## Credentials to Rotate

### 1. Summit Platform Credentials

| Credential | Environment Variable | Location |
|-----------|---------------------|----------|
| n8n Signing Secret | `N8N_SIGNING_SECRET` | Summit server config |
| n8n Base URL | `N8N_BASE_URL` | Summit server config |

### 2. n8n Instance Credentials (Self-Hosted)

These credentials are stored within n8n and used by workflows:

| Type | Description | n8n Credential Name |
|------|-------------|---------------------|
| GitHub PAT | Repository access for automation | `github-automation-pat` |
| AI API Keys | OpenAI, Anthropic, etc. | `openai-api-key`, `anthropic-api-key` |
| Database Credentials | PostgreSQL connections | `intelgraph-db-readonly` |

## Pre-Rotation Checklist

- [ ] Schedule maintenance window (low-traffic period)
- [ ] Notify affected teams
- [ ] Ensure n8n version is >= 1.121.0 (verify with `scripts/ci/verify_n8n_safe.sh`)
- [ ] Document current credential access list
- [ ] Prepare new credentials in advance

## Rotation Procedure

### Step 1: Generate New Signing Secret

```bash
# Generate new 32-byte secret
NEW_SECRET=$(openssl rand -hex 32)
echo "New N8N_SIGNING_SECRET: $NEW_SECRET"
```

### Step 2: Update Summit Server Configuration

1. Update secrets manager/vault with new `N8N_SIGNING_SECRET`
2. Deploy server with new configuration
3. Verify server health: `curl https://api.summit.ai/health`

### Step 3: Update n8n Webhook Configuration

1. Log into n8n admin console
2. Navigate to Settings > Webhooks
3. Update webhook signing secret to match new `N8N_SIGNING_SECRET`
4. Test a sample webhook trigger

### Step 4: Rotate GitHub PAT

1. Go to GitHub > Settings > Developer Settings > Personal Access Tokens
2. Generate new token with same scopes
3. Update in n8n: Credentials > github-automation-pat
4. Revoke old token

### Step 5: Rotate AI API Keys

1. **OpenAI**:
   - Generate new key at https://platform.openai.com/api-keys
   - Update in n8n: Credentials > openai-api-key
   - Revoke old key

2. **Anthropic**:
   - Generate new key at https://console.anthropic.com/settings/keys
   - Update in n8n: Credentials > anthropic-api-key
   - Revoke old key

### Step 6: Rotate Database Credentials

1. Create new database user with same permissions
2. Update in n8n: Credentials > intelgraph-db-readonly
3. Test database connectivity in affected workflows
4. Drop old database user

## Post-Rotation Verification

- [ ] All n8n workflows execute successfully
- [ ] Summit server can trigger n8n webhooks
- [ ] No authentication errors in logs
- [ ] Old credentials are revoked/deleted

## Rollback Procedure

If rotation causes issues:

1. Restore previous credentials from backup
2. Redeploy affected services
3. Investigate root cause before retrying

## Audit Trail

Record rotation completion in threat-intel-backlog:

```markdown
- [x] **[SEC-OPS-001] Rotate n8n Credentials**
  - **Completed**: YYYY-MM-DD
  - **Operator**: [Name]
  - **Credentials Rotated**: N8N_SIGNING_SECRET, GitHub PAT, AI API Keys, DB Credentials
```

## Related Documents

- [threat-intel-backlog-2026-01-22.md](../backlog/threat-intel-backlog-2026-01-22.md)
- [verify_n8n_safe.sh](../scripts/ci/verify_n8n_safe.sh)
- [n8n integration](../server/src/integrations/n8n.ts)
