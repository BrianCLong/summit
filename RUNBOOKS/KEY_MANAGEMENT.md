# Key Management & Rotation Runbook

## Overview
This runbook provides procedures for managing encryption keys via KMS (Key Management Service) and performing key rotation operations with zero downtime.

## Architecture

### Supported KMS Providers
- **AWS KMS**: Default provider for production environments
- **Azure Key Vault**: Enterprise environments using Azure
- **GCP Cloud KMS**: GCP-based deployments
- **Local HSM**: Air-gapped/on-premises deployments

### Key Types
1. **Data Encryption Keys (DEK)**: Encrypt application data at rest
2. **Key Encryption Keys (KEK)**: Encrypt DEKs (envelope encryption)
3. **API Keys**: Service-to-service authentication
4. **Database Credentials**: Rotating database passwords

## Key Rotation Strategy

### Rotation Schedule
- **Automated Rotation**: Every 90 days (quarterly)
- **Manual Rotation**: On-demand for security incidents
- **Emergency Rotation**: Within 1 hour for compromised keys

### Dual-Write Period
During rotation, the system maintains both old and new keys for 24 hours:
1. **T+0**: Generate new key version
2. **T+0 to T+24h**: Accept both old/new keys for decryption
3. **T+24h**: Disable old key version
4. **T+30d**: Delete old key material (compliance retention)

## Operational Procedures

### 1. Automated Quarterly Rotation

The automated rotation workflow (`key-rotation.yml`) runs every 90 days:

```bash
# Trigger manual rotation via GitHub Actions
gh workflow run key-rotation.yml \\
  --ref main \\
  --field key_type=all \\
  --field dry_run=false
```

**Automated Steps:**
1. Generate new key version in KMS
2. Update key version in Kubernetes secrets
3. Trigger gradual rollout across services
4. Verify decryption with both keys
5. Monitor error rates for 24 hours
6. Disable old key version
7. Send rotation complete notification

### 2. Emergency Key Rotation

For compromised keys, execute immediate rotation:

```bash
# Step 1: Trigger emergency rotation
gh workflow run key-rotation.yml \\
  --field key_type=database_master \\
  --field emergency=true \\
  --field dry_run=false

# Step 2: Verify rotation status
kubectl get secret summit-kms-keys -o yaml

# Step 3: Force pod restart to pick up new keys
kubectl rollout restart deployment/summit-api
kubectl rollout restart deployment/summit-worker

# Step 4: Monitor logs for decryption errors
kubectl logs -f deployment/summit-api | grep \"KMS_DECRYPT\"
```

**RTO (Recovery Time Objective)**: 15 minutes  
**RPO (Recovery Point Objective)**: 0 (no data loss)

### 3. Manual Key Rotation

For planned rotations or testing:

```bash
# Step 1: Create new key version
aws kms create-key \\
  --description \"Summit DEK v$(date +%Y%m%d)\" \\
  --key-usage ENCRYPT_DECRYPT \\
  --origin AWS_KMS

# Step 2: Update application config
export NEW_KEY_ID=\"arn:aws:kms:us-west-2:123456789:key/abc-123\"
kubectl set env deployment/summit-api KMS_KEY_ID=$NEW_KEY_ID

# Step 3: Enable dual-write mode
kubectl set env deployment/summit-api KMS_ROTATION_MODE=dual_write
kubectl set env deployment/summit-api KMS_OLD_KEY_ID=$OLD_KEY_ID

# Step 4: Wait 24 hours for data re-encryption

# Step 5: Disable old key
aws kms disable-key --key-id $OLD_KEY_ID

# Step 6: Exit dual-write mode
kubectl set env deployment/summit-api KMS_ROTATION_MODE-
kubectl set env deployment/summit-api KMS_OLD_KEY_ID-
```

### 4. Key Audit & Compliance

#### View Key Usage Logs
```bash
# AWS CloudTrail logs
aws cloudtrail lookup-events \\
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=$KEY_ID \\
  --max-results 100 \\
  --output table

# Application audit logs
kubectl logs -l app=summit-api | grep \"KMS_AUDIT\"
```

#### Generate Compliance Report
```bash
# Run weekly compliance check
gh workflow run key-audit.yml --field report_type=compliance

# Download report
gh run download --name key-compliance-report
```

## Monitoring & Alerts

### Key Metrics
- **Key Age**: Alert if > 85 days (pre-rotation warning)
- **Decryption Failures**: Alert if > 0.1% error rate
- **Key Access Rate**: Baseline normal usage patterns
- **Rotation Duration**: Alert if > 15 minutes

### Grafana Dashboards
- **KMS Operations**: Real-time key usage and performance
- **Rotation Status**: Progress tracking during rotation events
- **Audit Trail**: Complete history of key access and modifications

### Alert Escalation
1. **Warning** (85 days): Slack notification to #security channel
2. **Critical** (95 days): PagerDuty alert to on-call engineer
3. **Emergency**: Page security team immediately

## Disaster Recovery

### Key Backup Strategy
- **KMS-Native Backup**: Automatic replication across 3 AZs
- **Encrypted Export**: Weekly exports to S3 (encrypted with separate KEK)
- **Offline Backup**: Quarterly secure offline storage

### Key Recovery Procedures

#### Scenario 1: Accidental Key Deletion
```bash
# AWS KMS keys have 7-30 day deletion window
aws kms cancel-key-deletion --key-id $KEY_ID
```

#### Scenario 2: Complete KMS Service Outage
```bash
# Failover to backup KMS provider (Azure Key Vault)
export KMS_PROVIDER=azure
export AZURE_KEYVAULT_URL=\"https://summit-backup.vault.azure.net\"

# Restart services with new provider
kubectl rollout restart deployment/summit-api
```

#### Scenario 3: Data Re-encryption Required
```bash
# Trigger mass re-encryption job
kubectl create job mass-reencrypt --from=cronjob/data-encryption

# Monitor progress
kubectl logs job/mass-reencrypt --follow
```

## Security Best Practices

### Access Control
- **Principle of Least Privilege**: Limit KMS access to CI/CD and production services only
- **MFA Required**: Enforce MFA for manual key operations
- **IAM Roles**: Use IAM roles (not API keys) for service authentication
- **Audit Logging**: Enable CloudTrail/audit logs for all key operations

### Key Hygiene
- ✅ **DO**: Rotate keys quarterly (minimum)
- ✅ **DO**: Use envelope encryption (KEK + DEK)
- ✅ **DO**: Enable key versioning
- ✅ **DO**: Set key expiration policies
- ❌ **DON'T**: Hardcode keys in application code
- ❌ **DON'T**: Share keys across environments (dev/staging/prod)
- ❌ **DON'T**: Disable audit logging
- ❌ **DON'T**: Use the same key for multiple purposes

### Encryption Standards
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Length**: 256 bits minimum
- **Key Derivation**: PBKDF2 with 100,000+ iterations
- **Random Generation**: Use cryptographically secure random (CSPRNG)

## Troubleshooting

### Common Issues

#### Issue: Decryption Failures After Rotation
**Symptom**: Application logs show \"KMS decryption failed\" errors  
**Cause**: Old encrypted data not yet re-encrypted with new key  
**Resolution**:
```bash
# Re-enable dual-write mode temporarily
kubectl set env deployment/summit-api KMS_ROTATION_MODE=dual_write
kubectl set env deployment/summit-api KMS_OLD_KEY_ID=$OLD_KEY_ID

# Trigger re-encryption job
kubectl create job reencrypt-batch --from=cronjob/data-encryption
```

#### Issue: Key Rotation Timeout
**Symptom**: Rotation workflow exceeds 15 minute RTO  
**Cause**: Large dataset requiring re-encryption  
**Resolution**:
```bash
# Enable parallel re-encryption workers
kubectl scale deployment/reencryption-worker --replicas=10

# Monitor progress
kubectl get jobs -l app=reencryption
```

#### Issue: KMS Provider Unavailable
**Symptom**: HTTP 503 errors from KMS API  
**Cause**: Provider service outage or rate limiting  
**Resolution**:
```bash
# Check provider status
aws kms describe-key --key-id $KEY_ID

# If rate limited, implement exponential backoff
export KMS_RETRY_ATTEMPTS=5
export KMS_RETRY_DELAY_MS=1000

# If complete outage, failover to backup provider
export KMS_PROVIDER=azure
kubectl rollout restart deployment/summit-api
```

## Compliance & Auditing

### Regulatory Requirements
- **SOC 2**: Annual key rotation + audit trail
- **HIPAA**: 90-day rotation + encryption at rest
- **PCI-DSS**: Quarterly rotation + key separation
- **GDPR**: Data encryption + right to be forgotten support

### Audit Reports
Generated automatically and stored in `/compliance/reports/`:
- `key-rotation-history.csv`: All rotation events
- `key-access-audit.csv`: Every encrypt/decrypt operation
- `key-lifecycle.csv`: Creation, rotation, deletion events
- `compliance-summary.pdf`: Quarterly compliance attestation

## Contacts

### On-Call Rotation
- **Primary**: @security-oncall (PagerDuty)
- **Secondary**: @devops-oncall (PagerDuty)
- **Escalation**: @cto (Emergency only)

### Slack Channels
- `#security`: General security discussions
- `#incidents`: Active incident response
- `#compliance`: Audit and compliance questions

## Related Documentation
- [DR Runbook](./DR.md): Database backup and recovery
- [Security Scanning](../.github/workflows/semgrep-sast.yml): SAST workflows
- [Incident Response](./INCIDENT_RESPONSE_PLAYBOOK.md): Security incident procedures
