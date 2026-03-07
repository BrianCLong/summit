# Pricing Architecture & Governance

## 1. Pricing Principles

- **Value-Based**: We charge for metrics that correlate with customer success and value derivation (e.g., Active Tenants, Successful Resolutions), not just arbitrary inputs (e.g., API calls).
- **Predictable**: Customers should be able to forecast their spend. No "surprise bills" from opaque metrics.
- **Enforceable**: Every pricing lever must be enforced in code. If we can't meter it or gate it, we don't price on it.
- **Margin-Protective**: All deals must meet floor margin requirements. Discounting requires "give/get" (e.g., longer term, reference, case study).

## 2. Primary Metrics

- **Platform Fee**: Base fee for the "Control Plane" (seats + core features).
- **Usage Metric**: "Active Graph Nodes" or "Analyzed Events" (TBD based on value discovery).
- **Add-ons**: Specific high-value modules (e.g., "PsyOps Defense", "Compliance Vault").

## 3. Governance Council

- **Composition**: Product (Chair), Finance, Sales, Legal.
- **Cadence**: Monthly review of metrics, deal exceptions, and packaging performance.
- **Decision SLA**: 48 hours for standard exception requests; 1 week for packaging changes.

## 4. Quote Controls

- **Floor Price**: Minimum allowable price per unit.
- **Approval Matrix**:
  - < 10% Discount: Sales Manager
  - 10-25% Discount: VP Sales
  - > 25% Discount: CFO + Pricing Council
- **Guardrails**: No perpetual licenses. No "unlimited" usage without hard caps.

## 5. Pricing Intel System

- **Goal**: Monitor market pricing without violating antitrust laws.
- **Method**: Publicly available pricing pages, win/loss analysis data, 3rd party analyst reports.
- **Compliance**: NO direct communication with competitors about pricing. NO "signaling" future price moves.

## 6. Change Management

- All changes to List Price, Packaging, or Metrics must be recorded in the [Pricing Change Log](../pricing/CHANGE_LOG.md).
- Legacy plans are "grandfathered" for max 1 renewal cycle before forced migration.
