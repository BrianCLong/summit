# Dependency Delta

## Summary

- Added: none
- Removed: none
- Updated:
  - React ecosystem (standardized to v18)
  - ESLint (standardized to v8.57.0)
  - OpenTelemetry API (standardized to v1.7.0)
  - Storybook (standardized to v8.6.14)
  - Vite (pinned to v5.4.21)

## Notes

- **Rationale**:
  - Standardized React to 18 to resolve peer dependency mismatches across UI packages.
  - Downgraded ESLint to v8 to maintain compatibility with existing plugin ecosystem.
  - Aligned OTel API and Storybook versions to eliminate Skew and peer warnings.
  - Pinned Vite to v5 for plugin compatibility.
- **Risk**: Low. Some minor type surface reduction from React 19 -> 18, but increased ecosystem stability.
- **Rollback**: Revert overrides in root `package.json`.
