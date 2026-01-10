# Authentication Outage - Runbook

Guides triage and mitigation when authentication or SSO is unavailable.

## Detection

- [ ] Alert: `/auth/login` or `/auth/oidc/callback` error rate >5% for 5 minutes.
- [ ] Alert: Token issuance latency >2s or JWKS fetch failures.
- [ ] Increased support tickets: users unable to log in or refresh sessions.

## Immediate Actions (10 minutes)

- [ ] Declare incident channel; assign auth lead.
- [ ] Pause planned releases that change auth or routing.
- [ ] Enable verbose audit logging for auth events.

## Diagnostics

1. **Gateway health**
   - Command: `kubectl -n edge get pods -l app=authz-gateway -o wide`
   - Expected: Pods Running; no widespread restarts.
2. **OIDC IdP reachability**
   - Command: `curl -I $OIDC_ISSUER/.well-known/openid-configuration`
   - Expected: HTTP 200; latency <500 ms. If failing, engage IdP owner.
3. **JWKS validation**
   - Command: `curl -s $OIDC_JWKS_URI | jq '.keys | length'`
   - Expected: >=1 key. If zero, key rotation issue—switch to cached key if policy allows.
4. **Session store health**
   - Command: `redis-cli -h $SESSION_REDIS info stats | grep rejected_connections`
   - Expected: No spike in rejected connections.

## Mitigations

- [ ] Enable **break-glass** access (documented approval required):
  - Command: `curl -X POST $AUTHZ_ADMIN/break-glass/grant ...` with `BREAK_GLASS=1`.
  - Expected: Time-limited elevated token for on-call; audit log entry created.
- [ ] Fail-open for trusted service accounts (temporary):
  - Command: `featurectl enable auth.fail_open --ttl 15m`
  - Expected: Service-to-service traffic continues; user traffic still gated.
- [ ] Rotate JWKS cache:
  - Command: `authctl jwks refresh`
  - Expected: Cache repopulated; validation succeeds.

## Recovery Verification

- [ ] Login success rate >99% for 15 minutes.
- [ ] Token issuance and JWKS fetch latencies back to baseline.
- [ ] Break-glass sessions revoked or expired; audit trail captured.

## Communication

- [ ] Update every 15 minutes with auth success rate and mitigations.
- [ ] Notify security on any break-glass activation with reason and expiry.
