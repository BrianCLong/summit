# Secret Scanning and Remediation

## Current Status

**GitHub Secret Scanning**: Requires admin permissions to enable programmatically. Manual enablement required via repository settings.

## Required Actions

### 1. Enable Secret Scanning (Manual)
Navigate to repository Settings → Security → Code security and analysis:
- ✅ Enable "Secret scanning"
- ✅ Enable "Push protection"
- ✅ Enable "Dependabot alerts"
- ✅ Enable "Dependabot security updates"

### 2. Historical Secret Scan
Once enabled, GitHub will scan the entire repository history for exposed secrets. Review and remediate any findings:

```bash
# Check for any existing secrets
gh secret list --repo BrianCLong/summit

# Review any alerts
gh api /repos/BrianCLong/summit/secret-scanning/alerts
```

### 3. Secret Hygiene Best Practices

#### Developers
- Never commit API keys, passwords, or tokens
- Use environment variables for sensitive configuration
- Leverage GitHub Secrets for CI/CD credentials
- Run pre-commit hooks to catch secrets locally

#### Operations
- Rotate any exposed credentials immediately
- Use secrets management tools (Vault, AWS Secrets Manager)
- Implement least-privilege access for service accounts
- Monitor for unauthorized secret access

### 4. Remediation Playbook

When a secret is detected:

1. **Immediate Actions**
   - Rotate the exposed credential
   - Revoke API keys or tokens
   - Change passwords immediately

2. **Investigation**
   - Determine scope of exposure
   - Check access logs for unauthorized use
   - Identify affected systems and services

3. **Remediation**
   - Update applications with new credentials
   - Remove secret from git history if needed
   - Implement additional monitoring

4. **Prevention**
   - Review how secret was exposed
   - Implement additional safeguards
   - Update training and procedures

## Compliance Evidence

This configuration addresses:
- **SOC 2**: Access controls and credential management
- **ISO 27001**: Information security incident management
- **NIST**: Access control and incident response

**Owner**: Security Team
**Last Updated**: September 2025