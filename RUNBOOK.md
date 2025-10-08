# 📘 Maestro Conductor Operations Runbook

## 🔄 Rollback Quick-Card

### 1. Identify prior healthy tag
```bash
git tag --sort=-creatordate | head
```

### 2. Redeploy compose/env with TAG=<prior_tag>
```bash
# Using Makefile target
make deploy TAG=<prior_tag>
```

### 3. Verify and flip traffic
```bash
# Verify rollback
make verify-release-strict TAG=<prior_tag>

# If verification passes (green), then flip traffic (Nginx/Proxy)
```

## 🛡️ Post-GA Watch (First 7 Days)

### Monitoring
- Track verify pass rate, latency, and CI queue depth in Grafana
- Alert on: verify failure, missing evidence files, drift (HEAD≠TAG on protected branches)
- Run one restore drill from release artifacts into a clean host; record time-to-green

### Key Metrics to Watch
1. **Verify Pass Rate** - Should be 100%
2. **Verification Latency** - Should be < 30 seconds
3. **CI Queue Depth** - Should remain stable
4. **Artifact Availability** - All required artifacts should be accessible

## 🚨 Incident Response

### Critical Failure
1. Immediately execute rollback procedure above
2. Notify stakeholders via established communication channels
3. Document incident in post-mortem format
4. Implement preventive measures before next release

### Verification Failure
1. Check artifact integrity hashes
2. Verify commit SHA matches expectations
3. Ensure all required files are present
4. If issue persists, initiate rollback

## 📊 Health Checks

### Daily Verification
```bash
# Verify latest GA tag
make verify-release TAG=v2025.10.07

# Strict verification (requires exact commit match)
make verify-release-strict TAG=v2025.10.07
```

### Weekly Deep Validation
1. Run full evidence bundle generation
2. Validate all artifact hashes
3. Check provenance tracking
4. Verify CI/CD pipeline integrity

## 🔧 Maintenance Procedures

### Artifact Retention
- Set Actions artifact retention ≥ length of audit window
- Regularly review and clean up old artifacts per retention policy

### Security Updates
- Monitor for vulnerability alerts
- Apply security patches promptly
- Re-run verification after any security updates

### Tag Protection
- Ensure tag protection rules are in place
- Prevent force-delete and moving of release tags
- Restrict tag modifications to authorized personnel only

## 📞 Support Contacts

### Primary Contact
- **Brian Long** - brianclong@gmail.com

### Escalation Path
1. Primary Contact
2. Summit Release Council
3. Platform Leadership Team

## 📚 Documentation References

- [GA Release Summary](MAESTRO_CONDUCTOR_GA_SUMMARY.md)
- [Hardening Improvements](HARDENING_IMPROVEMENTS_SUMMARY.md)
- [Final Validation Summary](FINAL_RELEASE_VALIDATION_SUMMARY.md)
- [Evidence Bundle](dist/evidence-v0.3.2-mc-nightly.json)
- [Release Manifest](dist/release-manifest-v2025.10.07.yaml)
- [Release Attestation](dist/release-attestation-v2025.10.07.jsonld)