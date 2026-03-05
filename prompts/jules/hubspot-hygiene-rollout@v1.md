Enforce a safety‑first rollout for HubSpot CRM hygiene agents in Summit Studio v1. Implement:

1. **Sandbox‑Only v1 Writes**
- All initial hygiene runs must operate on *sandboxed data only*:
  - Either a dedicated sandbox portal if available, or
  - A cloned pipeline / cloned records (copy of deals/contacts/companies with a clear ‘Summit Sandbox’ naming convention).
- Absolutely no writes to production pipelines, stages, amounts, or core fields in the live HubSpot portal for v1.

2. **Clone & Sync Strategy**
- Implement a ‘Clone for Sandbox’ operation at onboarding: pull a slice of the production pipeline (e.g., current and last quarter’s open deals), replicate into sandbox objects, and mark them as such.
- Ensure hygiene proposals and accepted fixes apply only to sandbox records; provide a way to *preview* how those changes would look if applied to production (side‑by‑side diff).

3. **Promotion Workflow (Future‑Ready, Not Enabled by Default)**
- Design, but do not enable, an “Apply to Production” control:
  - Requires explicit workspace admin approval.
  - Shows impact summary (count and types of changes, value at risk) and demands a typed confirmation.
- Keep the control hidden or disabled for v1 pilots; log all simulation results so you can later compare “if applied” vs. actual.

4. **Safety Telemetry & Audit**
- Log every action in sandbox: issue detected, proposed fix, user decision (accept/edit/reject), and resulting sandbox state.
- Provide an audit view in Studio: “nothing in production was changed—these results are from a sandbox clone,” with timestamps and responsible users.

5. **Success Criteria**
- Zero production HubSpot records modified during v1 pilots.
- At least one full “simulate then manually apply in HubSpot” loop completed by each pilot RevOps team, proving value while maintaining a hard safety line.