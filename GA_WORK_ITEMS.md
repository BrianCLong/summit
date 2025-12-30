# Actionable Work Items (GA-Ready Sprint)

This list represents the backlog required to move Summit to `v4.0.0-GA`.

## P0: Release Engineering (BLOCKER)
- [ ] **[REL][CRITICAL] Align Monorepo Versioning**
    -   **Context**: Root is `2.0.0`, children are `4.0.0`.
    -   **Action**: Bump root `package.json` to `4.0.0-rc.1`. Sync all workspace packages.
    -   **Acceptance**: `npm run release` generates consistent tags.

## P0: Code Quality (BLOCKER)
- [ ] **[LINT][CRITICAL] Fix ESLint Config & Zero Errors**
    -   **Context**: 70k+ errors. Most are likely from unignored build/legacy dirs.
    -   **Action**: Update `eslint.config.js` to ignore `generated/`, `legacy/`, `archive/`. Fix remaining.
    -   **Acceptance**: `npm run lint` exits with 0.

## P1: Dependency Management
- [ ] **[DEP][HIGH] Resolve React Peer Dependency Conflicts**
    -   **Context**: `react-dom` 18 vs `react` 19.
    -   **Action**: Pin `react` and `react-dom` to `18.3.1` (stable) or upgrade fully to 19.
- [ ] **[DEP][HIGH] Align OpenTelemetry Versions**
    -   **Context**: Multiple versions of `@opentelemetry/api` causing runtime warnings.
    -   **Action**: Use `overrides` or `resolutions` to force single version.

## P1: Infrastructure
- [ ] **[INFRA][HIGH] Remove TODOs from K8s Manifests**
    -   **Context**: `k8s/cron/purge-processor.yaml` has `TODO: replace with actual processing logic`.
    -   **Action**: Implement logic or remove file from release artifact.

## P2: Documentation
- [ ] **[DOCS][MED] Update CHANGELOG for v4.0.0**
    -   **Context**: Needs to reflect the jump to v4.
    -   **Action**: Draft release notes highlighting "Enterprise Convergence".
