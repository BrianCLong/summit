# Admin Safety & Readiness Checklist

## "Admin capability is safe to ship if..."

### 1. Authentication & Authorization
- [ ] **MFA Enforced**: The capability requires MFA at the session level, or re-prompt for specific actions.
- [ ] **Role-Based Access Control (RBAC)**: The capability is explicitly mapped to a role in OPA (`policy/admin-panel.rego`).
- [ ] **Scope Validation**: The handler validates that the actor has permission *for the specific target tenant* (no IDOR).
- [ ] **Least Privilege**: The capability uses the minimum necessary permissions (e.g., Read-Only for views).

### 2. Audit & Observability
- [ ] **Audit Logged**: Every state-changing action is recorded in `ProvenanceLedger` with:
    -   `actor_id`
    -   `action_type`
    -   `target_resource`
    -   `changes` (diff)
    -   `reason` (if required)
- [ ] **Traceable**: Requests carry a correlation ID that links UI actions to backend logs.
- [ ] **Alerting**: High-risk actions (e.g., deletions, permission changes) trigger immediate alerts to Security channels.

### 3. Operational Safety (The "Oops" Factor)
- [ ] **Friction Added**: Destructive actions require a friction step (e.g., typing the resource name).
- [ ] **Rate Limited**: The endpoint has strict rate limits to prevent accidental bulk damage.
- [ ] **Soft Delete**: Deletions perform a "soft delete" (mark inactive) where possible, allowing recovery.
- [ ] **Confirmation**: The UI clearly displays the *impact* of the action (e.g., "This will affect 50 users").

### 4. Just-in-Time (JIT) & Approvals
- [ ] **Approval Workflow**: For `CRITICAL` actions (e.g., nuke tenant), a second approval is required (Four-Eyes principle).
- [ ] **Time-Bound**: Elevated access is automatically revoked after a set duration.
- [ ] **Reason Required**: The admin must provide a typed reason for the action.

### 5. Data Privacy
- [ ] **PII Masking**: Sensitive user data (e.g., phone numbers, addresses) is masked by default in list views.
- [ ] **Export Controls**: Data export capabilities are restricted to specific roles and rate-limited.

### 6. Deployment & Rollback
- [ ] **Feature Flagged**: New admin modules are behind a feature flag (`admin_v2_enabled`).
- [ ] **Tested**: Unit tests cover the permission logic (allow/deny cases).

---

## Verification Example

**Scenario**: Adding a "Force Password Reset" button.

1.  **Auth**: Restricted to `ADMIN` or `MODERATOR`.
2.  **Audit**: Logs "User X reset password for User Y".
3.  **Safety**: Requires confirmation modal.
4.  **Privacy**: Does not return the new password; sends it via email.
5.  **Rate Limit**: Max 5 resets per minute per admin.
