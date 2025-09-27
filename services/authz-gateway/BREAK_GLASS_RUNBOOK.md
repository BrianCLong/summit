# Break-Glass Account & Rotation Runbook

## Overview
The break-glass account provides emergency console and API access when OIDC or SCIM dependencies are unavailable. It is disabled by default and must only be enabled under documented incident conditions. Access is logged through the AuthZ Gateway audit trail.

## Account Profile
- **Username:** `cos-breakglass`
- **Roles:** `admin`, `writer`, `reader`
- **Tenant scope:** Determined by incident commander before activation; must match incident ticket.
- **Purpose tag:** `break-glass` (OPA policy restricts usage to emergency flows).
- **Storage:** Credentials are stored in the sealed secrets manager entry `authz-gateway/breakglass` (hardware-backed KMS).

## Activation Procedure
1. **Initiate incident:** Declare a SEV-1 incident and assign an incident commander (IC).
2. **Approval:** Obtain dual approval from the IC and Security Duty Officer (SDO).
3. **Audit prep:** Notify Audit & Compliance channel and start bridge recording. Capture ticket, reason, and tenant.
4. **Retrieve credentials:**
   - IC runs `sops -d secrets/breakglass.yaml` from the secure bastion.
   - Extract temporary password and tenant binding.
5. **Enable account:**
   - Set `BREAKGLASS_ENABLED=true` in AuthZ Gateway environment (kubectl patch or feature flag API).
   - Run `npm run breakglass:issue -- --tenant <TENANT_ID> --purpose break-glass` to mint a 15-minute JWT signed by the gateway keys.
6. **Access systems:** Use the issued JWT for console/API access. All requests must include header `x-purpose: break-glass`.
7. **Real-time monitoring:** Security monitors the audit stream for `break-glass` purpose and confirms OPA decisions.

## Deactivation & Rotation
1. **Expire token:** IC triggers `npm run breakglass:revoke` to invalidate outstanding tokens.
2. **Disable flag:** Reset `BREAKGLASS_ENABLED=false` and redeploy to ensure in-memory cache cleared.
3. **Rotate secrets:**
   - Generate new password with `openssl rand -base64 32`.
   - Update `secrets/breakglass.yaml` using `sops` (dual control required).
   - Record rotation in ticketing system and attach hash of new secret bundle.
4. **Post-incident review:**
   - Export `audit.log` entries filtered by `purpose="break-glass"`.
   - Confirm SCIM and OIDC restored; remove temporary tenant binding from OPA bundles.
   - Document timeline, approvals, and data touched in the incident record.

## Quarterly Drill Checklist
- [ ] Run tabletop exercise covering activation and rotation.
- [ ] Validate `breakglass:issue` script mints auditable tokens.
- [ ] Ensure SCIM directory marks account as `inactive` outside drills.
- [ ] Verify audit pipeline retains `break-glass` purpose entries ≥ 1 year.
