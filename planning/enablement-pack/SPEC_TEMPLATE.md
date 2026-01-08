# [Short Title of the Spec]

| Metadata        | Value                                                      |
| :-------------- | :--------------------------------------------------------- |
| **Spec ID**     | `SPEC-XXX`                                                 |
| **Status**      | Draft / Review / Approved / Building / Done / Defer / Kill |
| **Owner**       | @user                                                      |
| **Approvers**   | @reviewer1, @reviewer2                                     |
| **Target Date** | YYYY-MM-DD                                                 |
| **Epic/Ticket** | [Link to Epic/Ticket]                                      |

## 1. Context & Problem Statement

_Why are we doing this? What is the user pain or opportunity? Link to the Wishbook item._

## 2. Goals & Non-Goals

### Goals

- [ ] Goal 1
- [ ] Goal 2

### Non-Goals

_Explicitly state what is out of scope to prevent scope creep._

- [ ] We will not build X yet.
- [ ] We are not solving for Y user group.

## 3. User Stories & Acceptance Criteria

_Mandatory for Tier-0/1 work._

### Story 1: As a [User], I want to [Action], so that [Benefit].

**Acceptance Criteria:**

- [ ] Verify that ...
- [ ] Verify that ...
- [ ] Error case: ...

### Story 2: ...

## 4. Technical Design

### Architecture & Components

_High-level diagram or description._

### Dependencies

_List all dependencies required._

- **Services**: e.g., Auth Service, Graph Service
- **Schemas**: e.g., User Schema v2
- **UI Components**: e.g., Button, Table (Design System)
- **Vendors**: e.g., Auth0, AWS S3

### API Changes

_Link to Swagger/OpenAPI diff or describe endpoints._

### Data Model Changes

_Describe schema changes._

## 5. Rollout Plan

_How do we ship this safely?_

- **Feature Flags**: `enable_feature_x`
- **Cohorts**: Internal -> Beta -> GA
- **Telemetry**: Metric `feature_x_usage`
- **Rollback Criteria**: If error rate > 1%, disable flag.

## 6. Support Plan

_How do we support this in production?_

- **Runbooks**: Link to runbook or describe steps.
- **Macros**: Support response templates.
- **Diagnostics**: How to debug? (e.g., Log correlation ID).
- **Known Issues**: List any known limitations.

## 7. Security & Compliance

- [ ] PII review completed?
- [ ] OPA policies updated?
- [ ] Audit logs implemented?

## 8. Review & Sign-off

_Reviewers must sign off within 48 hours._

- [ ] Tech Lead Approval
- [ ] Product Approval
- [ ] Security Approval (if needed)
