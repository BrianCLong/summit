# Deployment Instructions: v5.4.0-batch3

**Release Tag:** `v5.4.0-batch3`
**Date:** 2026-01-29

## 1. Push Code & Tags

```bash
# Push main branch
git push origin main

# Push release tag
git push origin v5.4.0-batch3
```

## 2. Deploy to Staging

```bash
# Trigger Staging Deployment (if manual)
gh workflow run deploy-staging.yml --ref v5.4.0-batch3
```

## 3. Verify Staging

```bash
# Run smoke tests against staging
./scripts/smoke-test.sh https://api.staging.summit.example.com
```

## 4. Promote to Production

```bash
# Trigger Production Deployment
gh workflow run deploy-prod.yml --ref v5.4.0-batch3
```

## 5. Post-Deploy Verification

```bash
# Run production smoke tests
./scripts/smoke-test-production.sh https://api.summit.example.com
```
