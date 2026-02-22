# CADDS — Solicitation Standards & Interop Mapping

Reference: [Summit Readiness Assertion](../SUMMIT_READINESS_ASSERTION.md).

## Overview

CADDS (Containerized Autonomous Drone Delivery System) is treated as a requirements specimen for
OSINT→requirements capture with deterministic, attributable artifacts. Authority alignment is
anchored to the Summit governance stack and the readiness assertion. Source anchors:
DIU CADDS solicitation and The War Zone coverage.

## Claim Links (Evidence Anchors)

- **ITEM:CLAIM-01** — Robotic mass constraint and 1:1 operator model limit scale.
- **ITEM:REQ-02** — Storage, rapid deployment, management of multi-agent systems.
- **ITEM:REQ-03** — MOSA foundation; demonstrable within 90 days.
- **ITEM:REQ-04** — Transport via land/sea/air; rapid emplacement with minimal handling.
- **ITEM:REQ-05** — Full operational cycle in-container; dormant state; launch on command.
- **ITEM:REQ-06** — Homogeneous/heterogeneous Gov-directed UAS; multiple power sources.
- **ITEM:REQ-07** — Setup/displacement in minutes; crew size ≤2.
- **ITEM:REQ-08** — Operator-on-the-loop + operator-in-the-loop; open C2 interfaces.
- **ITEM:REQ-09** — Contested/ DDIL-resilient operations.

## Import / Export Matrix

| Flow | Format | Notes |
| --- | --- | --- |
| **Import** | Public HTML (DIU/TWZ) | Source pages captured via fixtures; deterministic parsing only. |
| **Export** | `requirements.json` | Normalized, attributable requirements with evidence IDs. |
| **Export** | `risk_register.json` | Threat-informed risks mapped to requirements. |
| **Export** | `interop_matrix.json` | MOSA + industry-standard interface placeholders. |
| **Export** | `evidence.md` | Snippet map with stable IDs and source URLs. |

## Non-Goals

- Not a procurement tool or proposal generator.
- Not an operational planning system for UAS/drone operations.
- No claims of MOSA or DoD compliance beyond documented mappings.
