Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Data Classification

This document defines the Data Classification taxonomy and registry for the Summit platform governance system.

**Scope:** This document describes the classification types and registry mechanism. It does not cover runtime enforcement or redaction, which are handled by the Redaction Engine (Wave W2) and Hooks (Wave W3).

## Classification Types

The `DataClassification` enum defines the high-level categories for data:

| Type         | Description                                              |
| ------------ | -------------------------------------------------------- |
| `PUBLIC`     | Information that can be freely disclosed.                |
| `INTERNAL`   | Information for internal use only.                       |
| `PII`        | Personally Identifiable Information (email, name, etc.). |
| `PHI`        | Protected Health Information.                            |
| `FINANCIAL`  | Financial data (credit cards, bank accounts).            |
| `SECRET`     | Secrets, API keys, tokens.                               |
| `RESTRICTED` | Data restricted by legal or compliance policies.         |
| `SYSTEM`     | System metadata (internal IDs).                          |

## Severity Levels

The `DataSeverity` enum defines the impact level:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

## Classification Registry

The `ClassificationRegistry` is a singleton service that maps entity field paths (e.g., `User.email`) to classification rules. Keys are **case-sensitive**.

### Usage

```typescript
import { ClassificationRegistry } from "@/governance/classification/registry";
import { DataClassification, DataSeverity } from "@/governance/classification/types";

const registry = ClassificationRegistry.getInstance();

// Register a field (case-sensitive path)
registry.register("User.email", DataClassification.PII, DataSeverity.HIGH);

// Check classification
const rule = registry.get("User.email");
if (rule?.classification === DataClassification.PII) {
  // Apply controls
}
```

## Integration with Sensitivity

This system complements the existing `SensitivityClass` found in `server/src/pii/sensitivity.ts`.

- **SensitivityClass**: Focuses on access control levels (e.g., Confidential, Top Secret) and clearance.
- **DataClassification**: Focuses on the _content type_ (PII, PHI, Financial) to drive specific governance policies like retention schedules and redaction patterns.
