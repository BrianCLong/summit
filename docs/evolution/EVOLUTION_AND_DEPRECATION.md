# Evolution & Deprecation Contract

## 1. Purpose
This contract defines the authoritative lifecycle for all Summit platform components. It ensures that evolution is predictable, transparent, and safe. No component (API, agent, policy, schema, workflow) can be removed or significantly altered without passing through the stages defined herein.

## 2. Scope
This contract applies to:
- **Public APIs** (REST, GraphQL, WebSocket)
- **Agent Definitions & Behaviors**
- **OPA Policies & Governance Rules**
- **Database Schemas & Data Models**
- **Workflows & Orchestration Definitions**

## 3. Deprecation Stages

The lifecycle consists of five strict stages. Transitions between stages must be recorded in the `DeprecationRegistry`.

| Stage | Description | Required Actions | Minimum Duration |
| :--- | :--- | :--- | :--- |
| **0. Active** | Fully supported. | Normal operation. | N/A |
| **1. Announce** | Intention to deprecate declared. | Register in `DeprecationRegistry`. Emit `Deprecation-Notice` headers. Log warnings on usage. | 30 days |
| **2. Warn** | Usage is discouraged. | Emit `Deprecation-Warning` headers (level: warning). Add explicit delays or "brownouts" (optional). Notify admins via UI. | 30 days |
| **3. Restrict** | Usage is restricted. | Block new users/integrations. Enforce strict rate limits. Require specific override flags/headers to use. | 30 days |
| **4. Disable** | Functionality turned off. | Return `410 Gone` or equivalent errors. Data remains read-only where applicable. | 14 days |
| **5. Remove** | Code/Artifacts removed. | Delete code. Archive data (if required). Update documentation. | Permanent |

## 4. Required Signals for Deprecation
A component may be nominated for deprecation based on:
- **Usage Drop**: < 5% of active tenants using the feature for 3 months.
- **Security Risk**: Identification of unmitigatable vulnerabilities.
- **Cost/Complexity**: Maintenance cost exceeds value (proven by metrics).
- **Drift**: Component functionality is superseded by a newer, strictly better alternative.

## 5. Minimum Notice Periods & Overrides
- **Standard**: 90 days total (Announce to Disable).
- **Critical Security**: Can be accelerated to **Immediate** (Disable) with CISO/CTO sign-off.
- **Beta/Experimental**: 7 days notice.

**Overrides**:
During the **Restrict** stage, tenants may request a temporary extension. This requires a `Deprecation-Override-Token` signed by the platform operator.

## 6. Evidence & Audit
All deprecation events must be logged to the `ProvenanceLedger`:
- `DEPRECATION_ANNOUNCED`
- `DEPRECATION_STAGE_CHANGED`
- `DEPRECATION_OVERRIDE_GRANTED`
- `COMPONENT_REMOVED`

Each record must include:
- `componentId`
- `reason`
- `replacement` (if any)
- `authorizingActor`
