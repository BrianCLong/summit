# Release Captain 🚢

**Intelligent PR review and auto-merge system for the Summit platform**

Release Captain is your automated code review assistant that maintains high quality standards while accelerating development velocity. It performs comprehensive analysis, applies auto-fixes, and safely merges PRs that meet all quality gates.

## Quick Start

### Basic Usage

```bash
# Review and merge a PR automatically
/merge-pr 123

# Review without merging (dry run)
/merge-pr 123 --dry-run

# Apply auto-fixes then merge
/merge-pr 123 --force-fixes

# Skip specific test types (emergency only)
/merge-pr 123 --skip e2e
```

### Manual Triggers

You can also trigger Release Captain via GitHub Actions:

1. Go to **Actions** → **Release Captain**
2. Click **Run workflow**
3. Enter PR number and select command
4. Click **Run workflow**

## Features

### 🔍 **Comprehensive Analysis**

- **Risk Assessment**: LOW/MEDIUM/HIGH based on change patterns
- **Change Categorization**: Frontend, backend, infrastructure, database, etc.
- **Breaking Change Detection**: API, schema, and migration analysis
- **Complexity Scoring**: File count, change size, and impact areas

### 🛡️ **Quality Gates**

| Gate          | Description                            | Auto-Fix |
| ------------- | -------------------------------------- | -------- |
| **Build**     | TypeScript compilation and bundling    | ❌       |
| **TypeCheck** | Type safety validation                 | ❌       |
| **Lint**      | ESLint code quality rules              | ✅       |
| **Tests**     | Unit test suite with coverage          | ❌       |
| **Security**  | Vulnerability and secret scanning      | ❌       |
| **Helm**      | Chart validation for infrastructure    | ❌       |
| **E2E**       | End-to-end tests for high-risk changes | ❌       |

### 🤖 **Auto-Fix Capabilities**

Release Captain can automatically fix common issues:

- ESLint rule violations (`--fix`)
- Prettier formatting inconsistencies
- Import organization and sorting
- Package.json field ordering
- Missing test descriptions

### 📊 **Risk-Based Validation**

**LOW Risk** (≤8 complexity):

- Standard quality gates
- Quick merge path

**MEDIUM Risk** (9-14 complexity):

- Extended validation
- Manual review recommended

**HIGH Risk** (≥15 complexity):

- Full test suite including E2E
- Mandatory manual review
- Post-merge monitoring

## Command Reference

### `/merge-pr` - Primary Command

**Syntax**: `/merge-pr [PR_NUMBER] [OPTIONS]`

**Options**:

- `--dry-run` - Analyze and report without merging
- `--force-fixes` - Apply auto-fixes before validation
- `--skip TYPE` - Skip specific test types (e.g., `e2e`, `unit`)

**Examples**:

```bash
/merge-pr 123                    # Standard review and merge
/merge-pr 123 --dry-run         # Review only
/merge-pr 123 --force-fixes     # Fix then merge
/merge-pr 123 --skip e2e        # Skip E2E tests (emergency)
```

### Supporting Commands

```bash
/rerun-tests [TYPE]             # Rerun specific test suite
/deploy --env staging           # Deploy after merge
/rollback --env staging --confirm  # Emergency rollback
/status                         # System status
/health-check                   # Service health
/help                          # Show all commands
```

## Integration

### PR Validation Workflow

Release Captain integrates with automatic PR validation:

1. **On PR Open**: Basic validation and risk assessment
2. **On Ready for Review**: Full quality gate suite
3. **On High Risk**: Additional E2E testing
4. **Policy Validation**: OPA-based rule enforcement

### CODEOWNERS Integration

Respects repository CODEOWNERS for:

- Critical path changes (charts/, RUNBOOKS/, tools/)
- Security-sensitive files
- Database migrations
- Infrastructure changes

## Configuration

### Quality Thresholds

```yaml
# Configurable in .github/policies/summit-quality-gates.rego
quality_gates:
  test_coverage_min: 80%
  lint_errors_max: 0
  security_vulnerabilities: none_high_critical
  build_warnings: review_required
```

### Auto-Fix Settings

```yaml
# Enable/disable auto-fixes
auto_fixes:
  lint: true
  format: true
  imports: true
  package_json: true
  test_descriptions: true
```

## Security & Authorization

### Who Can Use Release Captain

- Repository **Owner** (@BrianCLong)
- **Members** of authorized teams:
  - platform-team
  - sre-team
  - backend-team
  - frontend-team
- **Collaborators** with write access

### Security Checks

- **Secret Detection**: Scans for hardcoded credentials
- **Vulnerability Assessment**: NPM audit for dependencies
- **Code Pattern Analysis**: Dangerous patterns and anti-patterns
- **Permission Validation**: RBAC enforcement

## Troubleshooting

### Common Issues

**❌ "Quality gates failing"**

- Check specific gate failures in PR comments
- Run auto-fixes: `/merge-pr --force-fixes`
- Address specific issues mentioned in reports

**❌ "Access denied"**

- Verify you have repository write access
- Check if you're in authorized teams
- Contact @BrianCLong for permission issues

**❌ "PR has merge conflicts"**

- Resolve conflicts locally
- Push updated branch
- Re-run Release Captain

**❌ "High risk changes detected"**

- Review breaking changes carefully
- Consider feature flags for safer deployment
- Ensure E2E tests pass

### Debug Commands

```bash
# Get detailed analysis without merge
/merge-pr 123 --dry-run

# Check system status
/status

# Validate services
/health-check

# Rerun specific validation
/rerun-tests security
```

## Best Practices

### PR Preparation

1. **Keep PRs focused**: Single responsibility principle
2. **Update tests**: Add/modify tests for new functionality
3. **Document changes**: Clear PR description and commit messages
4. **Check dependencies**: Update package versions carefully
5. **Consider impact**: Use feature flags for risky changes

### Working with Release Captain

1. **Let it auto-fix**: Use `--force-fixes` for common issues
2. **Review reports**: Read the analysis comments carefully
3. **Address blockers**: Fix failing quality gates before manual review
4. **Monitor post-merge**: Watch metrics for high-risk changes

### Emergency Procedures

```bash
# Emergency hotfix bypass (use sparingly)
# 1. Label PR with "emergency-hotfix"
# 2. Ensure minimal changes
# 3. Get manual approval
/merge-pr 123 --skip e2e

# Emergency rollback
/rollback --env production --confirm
```

## Metrics & Monitoring

Release Captain tracks:

- **Merge Success Rate**: % of PRs that pass all gates
- **Time to Merge**: Average time from PR open to merge
- **Auto-Fix Effectiveness**: Issues resolved automatically
- **Quality Trends**: Code quality metrics over time
- **Risk Distribution**: LOW/MEDIUM/HIGH PR frequency

View metrics in the **Actions** tab and Prometheus/Grafana dashboards.

## Customization

### Adding Custom Quality Gates

1. Edit `.github/policies/summit-quality-gates.rego`
2. Add new rule in OPA policy format
3. Update `pr-validation.yml` workflow
4. Test with dry-run

### Custom Auto-Fixes

1. Modify `.github/actions/release-captain/action.yml`
2. Add auto-fix logic in the auto-fixer script
3. Update allowlist in policy
4. Test thoroughly

## Support

**Issues**: [GitHub Issues](https://github.com/BrianCLong/summit/issues)
**Documentation**: `/docs/release-captain.md`
**Team**: @platform-team
**Owner**: @BrianCLong

---

_🚢 Release Captain - Maintaining quality at velocity_
