# Secret Rotation Runbook

## Purpose

This runbook provides procedures for rotating secrets, credentials, and cryptographic keys in the Summit platform.

## Secret Types

| Type | Rotation Frequency | Automated | Manual Steps Required |
|------|-------------------|-----------|------------------------|
| API Keys (Internal) | 90 days | Yes | Restart services |
| API Keys (External) | 180 days | No | Update external config |
| Database Passwords | 90 days | Yes | Restart services |
| JWT Signing Keys | 180 days | Yes | Graceful rollover |
| TLS Certificates | Before expiry (auto-renew) | Yes | None |
| Service Account Keys | 90 days | Yes | Restart services |
| Encryption Keys | 1 year | No | Requires migration |
| OAuth Client Secrets | 1 year | No | Update OAuth provider |

---

## Automated Rotation (Recommended)

### Enable Automated Rotation

```bash
# Enable auto-rotation for database passwords
kubectl annotate secret database-credentials \
  sealed-secrets.summit.io/auto-rotate=true \
  sealed-secrets.summit.io/rotation-interval=90d

# Enable auto-rotation for API keys
kubectl annotate secret api-keys \
  sealed-secrets.summit.io/auto-rotate=true \
  sealed-secrets.summit.io/rotation-interval=90d
```

### Monitor Automated Rotation

```bash
# Check rotation status
scripts/security/check-rotation-status.sh

# View rotation history
kubectl get events -n summit-production --field-selector reason=SecretRotated

# Check next rotation date
scripts/security/next-rotation-dates.sh
```

---

## Manual Rotation Procedures

### 1. Database Credentials Rotation

**Frequency**: 90 days (or immediately if compromised)

**Procedure**:

```bash
# 1. Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# 2. Create new database user with new password
psql $DATABASE_URL <<EOF
CREATE USER summit_app_new WITH PASSWORD '$NEW_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE summit TO summit_app_new;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO summit_app_new;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO summit_app_new;
EOF

# 3. Update Kubernetes secret
kubectl create secret generic database-credentials-new \
  --from-literal=username=summit_app_new \
  --from-literal=password=$NEW_PASSWORD \
  --from-literal=host=postgres.summit.internal \
  --from-literal=port=5432 \
  --from-literal=database=summit \
  --dry-run=client -o yaml | \
kubeseal -o yaml > infra/sealed-secrets/production/database-credentials-new.yaml

# 4. Apply new sealed secret
kubectl apply -f infra/sealed-secrets/production/database-credentials-new.yaml

# 5. Update deployment to use new secret
kubectl set env deployment/intelgraph-server -n summit-production \
  --from secret/database-credentials-new

# 6. Restart deployment (rolling restart)
kubectl rollout restart deployment/intelgraph-server -n summit-production

# 7. Verify deployment is healthy
kubectl rollout status deployment/intelgraph-server -n summit-production
make smoke ENVIRONMENT=production

# 8. Wait 24 hours, monitor for issues

# 9. Drop old database user (after verification period)
psql $DATABASE_URL <<EOF
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM summit_app;
REVOKE ALL PRIVILEGES ON DATABASE summit FROM summit_app;
DROP USER summit_app;
EOF

# 10. Delete old secret
kubectl delete secret database-credentials -n summit-production

# 11. Rename new secret to standard name
kubectl get secret database-credentials-new -n summit-production -o yaml | \
  sed 's/database-credentials-new/database-credentials/' | \
  kubectl apply -f -
kubectl delete secret database-credentials-new -n summit-production
```

**Expected Time**: 30 minutes (+ 24 hour monitoring)

---

### 2. JWT Signing Key Rotation

**Frequency**: 180 days (or immediately if compromised)

**Strategy**: Graceful rollover (both old and new keys valid during transition)

**Procedure**:

```bash
# 1. Generate new RSA key pair
openssl genrsa -out jwt-private-new.pem 4096
openssl rsa -in jwt-private-new.pem -pubout -out jwt-public-new.pem

# 2. Create new secret with BOTH old and new keys
kubectl create secret generic jwt-keys-dual \
  --from-file=private-key-1=jwt-private.pem \
  --from-file=public-key-1=jwt-public.pem \
  --from-file=private-key-2=jwt-private-new.pem \
  --from-file=public-key-2=jwt-public-new.pem \
  --dry-run=client -o yaml | \
kubeseal -o yaml > infra/sealed-secrets/production/jwt-keys-dual.yaml

# 3. Apply dual-key secret
kubectl apply -f infra/sealed-secrets/production/jwt-keys-dual.yaml

# 4. Update application to:
#    - Sign JWTs with NEW key (key-2)
#    - Verify JWTs with BOTH keys (key-1 AND key-2)
kubectl set env deployment/intelgraph-server -n summit-production \
  JWT_SIGNING_KEY=private-key-2 \
  JWT_VERIFY_KEYS=public-key-1,public-key-2

# 5. Restart deployment
kubectl rollout restart deployment/intelgraph-server -n summit-production

# 6. Monitor for authentication issues
scripts/monitoring/watch-auth-metrics.sh --duration 1h

# 7. Wait for all old JWTs to expire (JWT_EXPIRY duration)
# If JWT expiry is 24 hours, wait 24 hours

# 8. Remove old key from verification
kubectl set env deployment/intelgraph-server -n summit-production \
  JWT_VERIFY_KEYS=public-key-2

# 9. Create final secret with only new key
kubectl create secret generic jwt-keys \
  --from-file=private-key=jwt-private-new.pem \
  --from-file=public-key=jwt-public-new.pem \
  --dry-run=client -o yaml | \
kubeseal -o yaml > infra/sealed-secrets/production/jwt-keys.yaml

kubectl apply -f infra/sealed-secrets/production/jwt-keys.yaml

# 10. Clean up
rm jwt-private.pem jwt-public.pem jwt-private-new.pem jwt-public-new.pem
kubectl delete secret jwt-keys-dual -n summit-production
```

**Expected Time**: 1 hour (+ 24-48 hour transition)

---

### 3. API Keys (Internal Services) Rotation

**Frequency**: 90 days

**Procedure**:

```bash
# 1. Generate new API key
NEW_API_KEY=$(openssl rand -hex 32)

# 2. Add new key to secrets (keep old key)
kubectl get secret api-keys -n summit-production -o json | \
  jq --arg new_key "$NEW_API_KEY" '.data["api-key-new"] = ($new_key | @base64)' | \
  kubectl apply -f -

# 3. Update consuming services to use new key
kubectl set env deployment/analytics-service -n summit-production \
  API_KEY=api-key-new

# 4. Restart consuming services
kubectl rollout restart deployment/analytics-service -n summit-production

# 5. Verify services are healthy
kubectl rollout status deployment/analytics-service -n summit-production
scripts/verify/check-api.sh

# 6. Wait 24 hours, monitor for issues

# 7. Remove old key from secret
kubectl get secret api-keys -n summit-production -o json | \
  jq 'del(.data["api-key"])' | \
  kubectl apply -f -

# 8. Rename new key to standard name
kubectl get secret api-keys -n summit-production -o json | \
  jq '.data["api-key"] = .data["api-key-new"] | del(.data["api-key-new"])' | \
  kubectl apply -f -
```

**Expected Time**: 20 minutes (+ 24 hour monitoring)

---

### 4. External API Keys (Third-Party Services) Rotation

**Frequency**: 180 days

**Examples**: Stripe, SendGrid, AWS, etc.

**Procedure**:

```bash
# 1. Log into third-party service portal
# (Manual step - varies by provider)

# 2. Generate new API key in provider portal
# (Manual step - varies by provider)

# 3. Update Kubernetes secret with new key
kubectl create secret generic external-api-keys \
  --from-literal=stripe-key=$NEW_STRIPE_KEY \
  --from-literal=sendgrid-key=$SENDGRID_KEY_UNCHANGED \
  --dry-run=client -o yaml | \
kubeseal -o yaml > infra/sealed-secrets/production/external-api-keys.yaml

kubectl apply -f infra/sealed-secrets/production/external-api-keys.yaml

# 4. Restart services using the key
kubectl rollout restart deployment/payment-service -n summit-production

# 5. Verify functionality
scripts/verify/check-external-integrations.sh --service stripe

# 6. Wait 24 hours, monitor for issues

# 7. Revoke old API key in provider portal
# (Manual step - varies by provider)
```

**Expected Time**: 30 minutes (+ 24 hour monitoring)

---

### 5. Service Account Keys (GCP, AWS, Azure) Rotation

**Frequency**: 90 days

**Procedure (AWS Example)**:

```bash
# 1. Create new IAM access key (keep old key)
aws iam create-access-key --user-name summit-production-service

# Output:
# AccessKeyId: AKIAIOSFODNN7EXAMPLE
# SecretAccessKey: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# 2. Update Kubernetes secret with new key
kubectl create secret generic aws-credentials \
  --from-literal=access-key-id=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secret-access-key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  --dry-run=client -o yaml | \
kubeseal -o yaml > infra/sealed-secrets/production/aws-credentials.yaml

kubectl apply -f infra/sealed-secrets/production/aws-credentials.yaml

# 3. Restart services using AWS credentials
kubectl rollout restart deployment/backup-service -n summit-production

# 4. Verify AWS operations work
scripts/verify/check-aws-access.sh

# 5. Wait 24 hours, monitor for issues

# 6. Deactivate old access key
aws iam update-access-key --user-name summit-production-service \
  --access-key-id AKIAI44QH8DHBEXAMPLE \
  --status Inactive

# 7. Wait 7 days (safety period)

# 8. Delete old access key
aws iam delete-access-key --user-name summit-production-service \
  --access-key-id AKIAI44QH8DHBEXAMPLE
```

**Expected Time**: 30 minutes (+ 7 day safety period)

---

### 6. TLS Certificate Rotation

**Frequency**: Before expiry (automated via cert-manager)

**Automated Renewal**:

```bash
# Check certificate expiry
kubectl get certificates -n summit-production

# Cert-manager automatically renews 30 days before expiry
# Monitor renewal
kubectl describe certificate summit-tls -n summit-production

# Force manual renewal (if needed)
kubectl delete secret summit-tls -n summit-production
# Cert-manager will automatically recreate
```

**Manual Certificate Rotation** (if not using cert-manager):

```bash
# 1. Generate new CSR
openssl req -new -newkey rsa:4096 -nodes \
  -keyout summit.key -out summit.csr \
  -subj "/CN=summit.production/O=Company"

# 2. Submit CSR to CA and obtain certificate

# 3. Create new secret
kubectl create secret tls summit-tls-new \
  --cert=summit.crt \
  --key=summit.key \
  --dry-run=client -o yaml | \
kubeseal -o yaml > infra/sealed-secrets/production/summit-tls-new.yaml

kubectl apply -f infra/sealed-secrets/production/summit-tls-new.yaml

# 4. Update ingress to use new certificate
kubectl patch ingress summit-ingress -n summit-production \
  -p '{"spec":{"tls":[{"hosts":["summit.production"],"secretName":"summit-tls-new"}]}}'

# 5. Verify TLS
curl -vI https://summit.production 2>&1 | grep -A 2 "Server certificate"

# 6. Wait 24 hours

# 7. Delete old certificate
kubectl delete secret summit-tls -n summit-production
mv infra/sealed-secrets/production/summit-tls-new.yaml \
   infra/sealed-secrets/production/summit-tls.yaml
```

---

### 7. Data Encryption Keys (DEK) Rotation

**Frequency**: Annually (or immediately if compromised)

**WARNING**: This requires re-encryption of all encrypted data

**Procedure**:

```bash
# 1. Backup all encrypted data
scripts/dr/backup-database.sh --reason "pre-dek-rotation-$(date +%Y%m%d)"

# 2. Generate new encryption key
NEW_DEK=$(openssl rand -base64 32)

# 3. Add new key to keyring (keep old key for decryption)
kubectl get secret encryption-keys -n summit-production -o json | \
  jq --arg new_key "$NEW_DEK" '.data["dek-v2"] = ($new_key | @base64)' | \
  kubectl apply -f -

# 4. Update application to:
#    - Encrypt NEW data with new key (dek-v2)
#    - Decrypt OLD data with old key (dek-v1)
kubectl set env deployment/intelgraph-server -n summit-production \
  ENCRYPTION_KEY_WRITE=dek-v2 \
  ENCRYPTION_KEY_READ=dek-v1,dek-v2

# 5. Restart application
kubectl rollout restart deployment/intelgraph-server -n summit-production

# 6. Run data re-encryption job (in batches to avoid overload)
kubectl apply -f jobs/re-encrypt-data-job.yaml

# Monitor progress
kubectl logs -n summit-production -f job/re-encrypt-data

# 7. Verify re-encryption completed successfully
scripts/security/verify-encryption.sh

# 8. Remove old key from application config
kubectl set env deployment/intelgraph-server -n summit-production \
  ENCRYPTION_KEY_READ=dek-v2

# 9. Archive old key (do not delete - may need for old backups)
kubectl get secret encryption-keys -n summit-production -o json | \
  jq '.data["dek-v1-archived-$(date +%Y%m%d)"] = .data["dek-v1"] | del(.data["dek-v1"])' | \
  kubectl apply -f -
```

**Expected Time**: 4-8 hours (depends on data volume)

---

## Emergency Secret Rotation (Security Breach)

**When**: Suspected or confirmed credential compromise

**Procedure**:

```bash
# 1. Immediately rotate ALL secrets
scripts/security/emergency-rotate-all.sh

# This rotates (in parallel):
# - Database passwords
# - API keys (internal)
# - JWT signing keys
# - Service account keys
# - TLS certificates (if compromised)

# 2. Restart all services
kubectl rollout restart deployment -n summit-production --all

# 3. Force logout all users
scripts/security/force-logout-all-users.sh

# 4. Audit access logs
scripts/security/audit-access-logs.sh --since "24 hours ago"

# 5. Monitor for unauthorized access
scripts/security/monitor-threats.sh --duration 7d

# 6. Update external integrations (manual)
# Contact each third-party provider
```

**Expected Time**: 2-4 hours

---

## Secret Rotation Monitoring

### Check Rotation Status

```bash
# View all secrets and their last rotation date
scripts/security/list-secrets-rotation-status.sh

# Output:
# SECRET                    LAST_ROTATED    NEXT_ROTATION   STATUS
# database-credentials      2025-11-15      2026-02-13      OK
# jwt-keys                  2025-09-20      2026-03-20      OK
# api-keys                  2025-12-01      2026-03-01      OK
# aws-credentials           2024-10-10      2025-01-10      OVERDUE
```

### Alerts

Set up alerts for:
- Secrets not rotated in > 100 days (warning)
- Secrets not rotated in > 120 days (critical)
- Rotation job failures (immediate)
- Certificate expiry < 30 days (warning)
- Certificate expiry < 7 days (critical)

---

## Secret Rotation Testing

### Test Rotation Procedures (Quarterly)

```bash
# Run rotation test in staging
scripts/security/test-rotation.sh --environment staging

# This tests rotation of:
# - Database passwords
# - API keys
# - JWT keys
# - Service accounts

# Verify services remain healthy after rotation
make smoke ENVIRONMENT=staging
```

---

## Compliance & Audit

For SOC2/ISO compliance:

1. **All rotations are logged**
   ```bash
   scripts/compliance/log-secret-rotation.sh --secret-name database-credentials
   ```

2. **Rotation history is retained** (2 years minimum)

3. **Rotation policy is enforced**
   - Automated rotation enabled for critical secrets
   - Manual rotation reminders for non-automatable secrets

4. **Evidence is collected**
   ```bash
   scripts/compliance/generate-rotation-evidence.sh --quarter Q1-2026
   ```

---

## Secret Rotation Checklist

Before rotating any secret:

- [ ] Backup current secret (for rollback)
- [ ] Notify team of upcoming rotation
- [ ] Schedule rotation during low-traffic period
- [ ] Prepare rollback plan
- [ ] Verify dependent services
- [ ] Test rotation in staging first

During rotation:

- [ ] Follow documented procedure
- [ ] Monitor service health continuously
- [ ] Keep old secret active initially (dual-key period)
- [ ] Restart affected services
- [ ] Run smoke tests

After rotation:

- [ ] Verify all services healthy
- [ ] Monitor for 24 hours minimum
- [ ] Remove old secret after verification period
- [ ] Update documentation
- [ ] Log rotation in compliance system

---

## Related Runbooks

- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) - Incident response procedures
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) - Disaster recovery procedures

---

**Last Updated**: 2026-01-02
**Owner**: Security Team
**Review Cycle**: Quarterly
