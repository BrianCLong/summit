# Lineage and Provenance Standards

**Status:** Standards Locked
**Owner:** Jules

## 1. Standards Commitment

Summit formally adopts **OpenLineage** and **PROV** as first-class lineage and provenance standards. This decision is binding for all GA-grade dataflows.

## 2. Canonical Mappings

### OpenLineage Mappings

| Summit Entity | OpenLineage Entity |
| :--- | :--- |
| **Summit Job** | **OpenLineage Job** |
| **Summit Run** | **OpenLineage Run** |
| **Summit Dataset** | **OpenLineage Dataset** |

### PROV Mappings

| Summit Entity | PROV Entity |
| :--- | :--- |
| **Summit Actor / Policy** | **PROV Agent** |
| **Summit Transformation** | **PROV Activity** |
| **Governance Verdict** | **PROV Entity Attributes** |
| **Evidence Bundle** | **PROV Entity** |
| **Policy Evaluation** | **PROV Activity** |

## 3. Implementation Requirements

### Non-Optional for GA
Implementation of these standards is **non-optional** for any dataflow designated as GA-grade.

### Lineage Emission
- All pipelines must emit OpenLineage-compliant JSON events.
- Events must be deterministic (stable IDs, deterministic ordering).
- Payloads must be SHA-bound.

### Provenance Semantics
- Provenance must be legally and auditor interpretable.
- Support for PROV-JSON export is mandatory.
