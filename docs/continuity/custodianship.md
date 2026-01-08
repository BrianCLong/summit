# Custodianship Register

## 1. Preamble

Memory without ownership decays. This document establishes the **Custodianship Council**, the body entrusted with the ultimate responsibility for preserving the purpose, constraints, and defensive posture of the Summit system. The Council acts as the final guardrail against institutional drift and capture. Its authority is derived from the system's foundational governance and is binding on all operators and administrators.

## 2. Council Charter

### 2.1. Mandate

The Custodianship Council's primary mandate is to ensure the continuity of the system's core principles as defined in the **Purpose Lock Charter** (`purpose-lock.md`) and the **Safety Invariants** (`SAFETY_INVARIANTS.md`). They are the human stewards of the system's institutional memory.

### 2.2. Composition

- The Council shall consist of **three (3) seats**.
- Seats are role-based, not person-based:
  - **Lead Technical Custodian:** Responsible for the technical enforcement of invariants. Must be a senior engineer with deep system knowledge.
  - **Lead Governance Custodian:** Responsible for the procedural and legal integrity of the system. Must have a background in law, ethics, or compliance.
  - **Lead Mission Custodian:** Responsible for ensuring the system's operations remain aligned with its stated purpose. Must have a background in the primary mission domain the system serves.
- No single person may hold more than one seat.

## 3. Register of Current Custodians

| Seat                          | Current Custodian    | Term Start Date | Primary Responsibility                                        |
| ----------------------------- | -------------------- | --------------- | ------------------------------------------------------------- |
| **Lead Technical Custodian**  | `[Name Placeholder]` | `[YYYY-MM-DD]`  | Guarding the `SAFETY_INVARIANTS.md` and their implementation. |
| **Lead Governance Custodian** | `[Name Placeholder]` | `[YYYY-MM-DD]`  | Guarding the `purpose-lock.md` and `authority-transition.md`. |
| **Lead Mission Custodian**    | `[Name Placeholder]` | `[YYYY-MM-DD]`  | Guarding against `semantic-drift.md` and mission creep.       |

_Note: This register is a living document and must be updated within 24 hours of any change in custodianship._

## 4. Core Powers and Responsibilities

- **Review Cadence:** The Council must meet once per quarter to review Drift Sentinel reports, system exception logs, and any pending authority transitions.
- **Amendment Authority:** The Council holds the sole authority to approve amendments to the Purpose Lock Charter, requiring a unanimous (3/3) vote.
- **Veto Power:** Any Council member may issue a temporary veto on any system change or feature deployment that they believe violates a core invariant. The veto forces a mandatory review at the next Council meeting.
- **Transition Approval:** All authority transitions, as defined in `authority-transition.md`, require the approval of at least one Custodian.
- **M&A Safety Audit:** The Council is responsible for conducting the `merger-safety.md` checklist during any acquisition event.

## 5. Succession Protocol

To prevent capture of the Council itself, the succession process is designed to be deliberate and transparent.

1.  **Vacancy:** When a seat becomes vacant, the remaining two Custodians have 30 days to nominate a successor.
2.  **Unanimous Nomination:** The nomination must be unanimous.
3.  **Public Comment:** The nominee is publicly announced for a 14-day comment period, during which any stakeholder can raise objections.
4.  **Confirmation:** If no substantive objections are raised (as determined by the remaining Custodians), the nominee is confirmed.
5.  **Stalemate Resolution:** If the remaining Custodians cannot agree on a nominee, or if a nominee is rejected, a pre-designated external arbiter (e.g., a specific seat at a partner academic institution or non-profit) will be called upon to make a binding appointment. This arbiter is defined in the system's master governance documents.
