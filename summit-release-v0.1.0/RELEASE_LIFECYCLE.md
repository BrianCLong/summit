# Release Lifecycle Policy

## Versioning Strategy

We follow [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backward-compatible functionality
- **PATCH** version for backward-compatible bug fixes

### Version Numbering

Format: `v{MAJOR}.{MINOR}.{PATCH}[-{PRERELEASE}][+{BUILD}]`

Examples:
- Stable release: `v0.1.0`
- Pre-release: `v0.2.0-alpha.1`
- Build metadata: `v0.1.0+20251008`

## Release Types

### Major Releases (v1.0.0, v2.0.0)
- Significant new functionality or architecture changes
- May introduce breaking changes
- Require extensive testing and documentation
- Announced 30+ days in advance

### Minor Releases (v0.1.0, v0.2.0)
- New features and enhancements
- Backward-compatible API changes
- May deprecate features (with 90-day notice)
- Released quarterly or as features complete

### Patch Releases (v0.1.1, v0.1.2)
- Bug fixes and security patches
- Performance improvements
- No breaking changes
- Released as needed (typically weekly/monthly)

## Support Windows

### Active Support
- Latest minor version: Full support with patches and updates
- Previous minor version: Security fixes only
- LTS versions: Extended support (18+ months)

### End of Life (EOL)
- Versions no longer receive updates
- Announced 90 days in advance
- Migration guides provided

Current support matrix:
```
v0.1.x  ✅ Active Development (latest)
< 0.1.0 ❌ End of Life
```

## Deprecation Policy

### Feature Deprecation
1. **Notice**: 90 days advance warning in release notes
2. **Period**: Feature remains functional but logs warnings
3. **Removal**: Removed in next MINOR version
4. **Migration**: Clear path documented with examples

### API Deprecation
1. **Notice**: 180 days advance warning
2. **Period**: Backward compatibility maintained
3. **Removal**: Removed in next MAJOR version
4. **Migration**: Comprehensive upgrade guide

## Release Cadence

### Scheduled Releases
- **Minor versions**: Quarterly (January, April, July, October)
- **Patch versions**: As needed for critical fixes
- **Major versions**: As architectural milestones are achieved

### Unscheduled Releases
- **Hotfixes**: Within 24 hours for critical security issues
- **Emergency patches**: For data loss or service outage risks

## Branch Strategy

### Main Branch
- `main`: Current development HEAD
- Protected with required CI checks
- Direct commits restricted to maintainers

### Release Branches
- Format: `release/v{MAJOR}.{MINOR}.x`
- Created at feature freeze
- Receive only bug fixes and documentation updates
- Merged to main after each patch

### Hotfix Branches
- Format: `hotfix/{ISSUE}-{DESCRIPTION}`
- Branched from latest release tag
- Merged to main and latest release branch
- Trigger immediate patch release

### Patch Train Branch (v0.1.x)
- Branch: `release/v0.1`
- Accepts only:
  * Documentation/observability refinements
  * CVE bumps
  * Zero-schema fixes
- Requires: compose-boot + smoke + sentinel + config-contract checks
- Policy: "No feature deltas on `v0.1.x`" - strict maintenance mode

## Quality Gates

### Pre-Release Checklist
- [ ] All CI checks passing
- [ ] Security scan clean
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Migration guide (if breaking changes)
- [ ] Release notes drafted

### Post-Release Validation
- [ ] Smoke test in production environment
- [ ] Monitoring dashboards showing green
- [ ] Customer feedback channels monitored
- [ ] Rollback plan verified

## Communication

### Release Announcements
- GitHub Releases with detailed notes
- Mailing list notification
- Social media announcement (major/minor only)
- Community forum post

### Breaking Changes
- Highlighted in release notes
- Dedicated migration section
- Backward compatibility timeline
- Support team training

### Security Updates
- Private disclosure to security list
- Coordinated with major distributions
- CVE assignment when applicable
- Silent patch releases for critical issues