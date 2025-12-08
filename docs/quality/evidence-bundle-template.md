# Release Evidence Bundle: v{VERSION}

**Date:** {YYYY-MM-DD}
**Commit:** {COMMIT_HASH}
**Tag:** {TAG_NAME}

## 1. Test Summary

| Suite | Status | Duration | Pass/Total |
|-------|--------|----------|------------|
| Unit (Backend) | ✅/❌ | 2m 30s | 450/450 |
| Unit (Frontend) | ✅/❌ | 1m 15s | 120/120 |
| Integration | ✅/❌ | 5m 00s | 85/85 |
| E2E (Critical) | ✅/❌ | 12m 00s | 5/5 |
| Contract | ✅/❌ | 0m 30s | 20/20 |

**Link to CI Run:** {URL}

## 2. Coverage Report
- **Backend**: {XX}% (Target: 80%)
- **Frontend**: {XX}% (Target: 60%)

## 3. Supply Chain Security
- [ ] SBOM Generated (`sbom.spdx.json`)
- [ ] Artifacts Signed (Cosign)
- [ ] Vulnerability Scan Clean (Trivy)

## 4. Known Issues / Exceptions
- Issue #123: ... (Approved by: ...)

## 5. Sign-off
- **QA/RelEng**: {NAME}
- **Product Owner**: {NAME}
