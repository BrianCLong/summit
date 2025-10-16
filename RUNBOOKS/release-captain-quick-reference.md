# 🚢 Release Captain Quick Reference

## ChatOps Commands

| Command                   | Description                              | Example                       |
| ------------------------- | ---------------------------------------- | ----------------------------- |
| `/merge-pr`               | Trigger Release Captain review and merge | `/merge-pr 123`               |
| `/merge-pr --dry-run`     | Review only, no merge                    | `/merge-pr 123 --dry-run`     |
| `/merge-pr --force-fixes` | Auto-fix issues and merge                | `/merge-pr 123 --force-fixes` |
| `/emergency-on`           | Enable emergency bypass                  | `/emergency-on P0 outage`     |
| `/emergency-off`          | Disable emergency mode                   | `/emergency-off`              |

## Safety Circuit Commands

```bash
# Check deployment safety
.github/scripts/safety-circuit.js check

# View circuit status
.github/scripts/safety-circuit.js status

# Record deployment success/failure
.github/scripts/safety-circuit.js record-success
.github/scripts/safety-circuit.js record-failure

# Emergency override
.github/scripts/safety-circuit.js emergency-on "reason"
.github/scripts/safety-circuit.js emergency-off

# Reset circuit breaker
.github/scripts/safety-circuit.js reset
```

## Quality Gates

| Gate         | Description            | Required For           |
| ------------ | ---------------------- | ---------------------- |
| 🔨 Build     | TypeScript compilation | All PRs                |
| 🔍 TypeCheck | Type safety validation | All PRs                |
| 🎯 Lint      | Code style and quality | All PRs                |
| 🧪 Tests     | Unit test suite        | All PRs                |
| 🔒 Security  | Vulnerability scan     | All PRs                |
| ⚓ Helm      | Chart validation       | Infrastructure changes |
| 🎬 E2E       | End-to-end tests       | High-risk changes      |

## Risk Levels

### LOW (Green)

- Documentation changes
- Simple frontend components
- Minor configuration updates
- < 10 files changed

### MEDIUM (Yellow)

- Backend API changes
- Database queries (non-migration)
- Configuration changes
- 10-20 files changed

### HIGH (Red)

- Database migrations
- Infrastructure changes
- Authentication/security code
- Breaking API changes
- > 20 files changed

## Emergency Procedures

### Critical Hotfix (P0)

1. Apply `emergency-hotfix` label to PR
2. Enable emergency mode: `/emergency-on "P0 production outage"`
3. Use Release Captain: `/merge-pr PR_NUMBER`
4. Monitor deployment carefully
5. Disable emergency mode: `/emergency-off`

### Circuit Breaker Open

1. Check status: `.github/scripts/safety-circuit.js status`
2. Wait for automatic reset (30 minutes)
3. Or manual reset: `.github/scripts/safety-circuit.js reset`
4. Use emergency override if critical

### Auto-Rollback Triggered

1. Check #incidents channel for auto-generated issue
2. Verify rollback completion
3. Investigate root cause
4. Fix and re-deploy when ready

## Troubleshooting

### PR Not Merging

- Check if draft PR
- Verify user permissions
- Check failing quality gates
- Review safety circuit status

### Quality Gates Failing

- Build: `pnpm run build`
- TypeCheck: `pnpm run typecheck`
- Lint: `pnpm run lint --fix`
- Tests: `pnpm run test`
- Security: Check for hardcoded secrets

### OPA Policy Issues

- Test locally: `opa eval -d .github/policies -i input.json "data.summit.release.decision"`
- Check syntax: `opa fmt .github/policies/release.rego`
- Review policy logs in workflow

## Monitoring URLs

- **GitHub Actions**: `/actions`
- **Security Alerts**: `/security/code-scanning`
- **Deployments**: `/deployments`
- **Issues**: `/issues?q=label:release-captain`

## Contact Information

| Issue Type  | Contact        | Response Time |
| ----------- | -------------- | ------------- |
| P0 Outage   | @sre-team      | Immediate     |
| P1 Degraded | @platform-team | 30 minutes    |
| Questions   | @platform-team | 4 hours       |
| Security    | @security-team | 24 hours      |

---

_For detailed procedures, see [Release Captain Verification Playbook](./release-captain-verification.md)_
