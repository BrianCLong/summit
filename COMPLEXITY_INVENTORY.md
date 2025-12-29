# Complexity Inventory (Sprint N+50)

This inventory identifies and classifies system complexity to guide simplification efforts.

## Legend
- **Essential:** Core business logic, critical safeguards, or required by compliance. Cannot be removed.
- **Accidental:** Redundant, overly complex, or misplaced logic. Target for consolidation or simplification.
- **Legacy:** Dead code, deprecated paths, or superseded features. Target for removal.

## 1. Capabilities & SKUs
| Item | Location | Classification | Notes |
|------|----------|----------------|-------|
| MVP1 Feature Flags | `server/src/config/mvp1-features.ts` | **Legacy (Removed)** | Merged into `featureFlags.ts`. |
| Agent Features | `server/src/config/agent-features.ts` | **Legacy (Removed)** | Merged into `featureFlags.ts`. |
| Product Definition | `server/src/config/product.ts` | **Essential** | Defines product name, version, and tiers. |
| Feature Flags Core | `server/src/config/featureFlags.ts` | **Essential** | Main feature flag system. |
| Production Security | `server/src/config/production-security.ts` | **Essential** | Critical security settings (Middleware/Config). |

## 2. Policies & Invariants
| Item | Location | Classification | Notes |
|------|----------|----------------|-------|
| Access Policy | `policy/access.rego` | **Legacy (Removed)** | Consolidated into `main.rego`. |
| Data Policy | `policy/data.rego` | **Essential** | Data access rules. |
| Main Policy | `policy/main.rego` | **Essential** | Main entry point for OPA. |

## 3. CI Workflows
| Item | Location | Classification | Notes |
|------|----------|----------------|-------|
| Agentic Lifecycle | `.github/workflows/agentic-lifecycle.yml` | **Essential** | Automation for agentic workflows. |
| Security | `.github/workflows/security.yml` | **Essential** | Supply chain security. |
| Smoke Test | `.github/workflows/smoke-test.yml` | **Essential** | Critical verification. |
| SLO Badge | `.github/workflows/slo-badge.yml` | **Essential** | Visibility. |

## 4. Operational Surfaces
| Item | Location | Classification | Notes |
|------|----------|----------------|-------|
| Feature Flags | `server/src/config/featureFlags.ts` | **Essential** | Operational control. |
| Env Config | `server/src/config/env.ts` | **Essential** | Environment variables. |
