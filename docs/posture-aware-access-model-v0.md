# Posture-Aware Access Model v0

## 1. Posture model

### Device attributes

- **Management status**: managed, BYOD registered, unmanaged/unknown.
- **OS and version**: platform, build, jailbreak/root indicators.
- **Patch posture**: latest security update age, missing critical CVEs, auto-update status.
- **Security tooling**: EDR/AV presence and health, disk encryption, screen-lock policy, firewall state.
- **Trust health**: local risk score (0–100) derived from vulnerabilities, malware detections, config drift, and recent incident flags.

### Network attributes

- **Location**: geo (country/region) and facility tags (office, datacenter, home, travel).
- **Ownership**: corporate vs. public, Wi-Fi vs. cellular, hotspot indicators.
- **Provider**: ASN, ISP reputation, enterprise-managed gateway ID.
- **Session protection**: VPN/SDP usage, TLS interception, captive portal, DNS security (DoH/DoT) state.
- **Network risk**: anomaly score factoring sudden ASN/geo shifts, TOR/known bad IP ranges, and MITM signals.

### Session context

- **Temporal**: time-of-day/day-of-week norms, recent session freshness, inactivity threshold.
- **Behavioral**: typical resource set, command/API patterns, frequency/volume compared to peer group.
- **Access provenance**: SSO app/source IP consistency, device switching cadence, cookie binding to device posture.
- **Change velocity**: recent posture deltas (e.g., OS downgrade, VPN drop, risk score jump).

## 2. Policy integration

- **ABAC/OPA inputs**: Expose `device.trust_level`, `device.risk_score`, `device.security_tools`, `network.classification`, `network.vpn`, `network.asn`, `session.behavior_score`, and `posture.freshness` as attributes in policy queries.
- **Access tiers**:
  - _Tier 0 (break-glass)_: always restricted; requires security-approved tokens, hardware key, and just-in-time approval regardless of posture.
  - _Tier 1 (sensitive data/privileged actions)_: requires managed + compliant device, corporate or trusted VPN network, and behavior score within norms; step-up if posture freshness >4 hours or risk_score >40.
  - _Tier 2 (standard apps)_: allowed on managed or registered BYOD with medium risk_score (<70) and non-malicious network; trigger CAPTCHA/WebAuthn if network risk spikes.
  - _Tier 3 (low-risk/self-service)_: allowed broadly but still log posture and block if device flagged compromised.
- **Step-up auth triggers**: posture change during session (VPN drop, risk_score increase >15, OS downgrade), geo/ASN shift, behavior anomaly, stale posture data, or accessing a higher tier than current assurance.
- **Continuous evaluation**: enforce at session creation and on every privilege-sensitive action; cache posture with TTL and revalidate on change events from posture sources.
- **Exceptions**: temporary exceptions with scope (resource), duration, and reviewer; require explicit risk owner; posture enforcement resumes automatically post-expiry.
- **Break-glass flow**: dedicated roles/groups, time-bound tokens, audit-only workstation list, dual approval, and mandatory post-incident review.

## 3. Integration patterns

- **Signal sources**:
  - Device: MDM (compliance, patch), EDR (health, detections), certificate management (attestation), OS queries (disk encryption).
  - Network: SDP/VPN concentrators, SWG/ZTNA logs, Wi-Fi controllers, IP intelligence feeds, DNS security platforms.
  - Session/behavior: SIEM/UEBA, access proxy logs, risk scoring engines.
- **Ingestion & sync**:
  - Normalize signals into a posture service with per-tenant namespaces; map device IDs (serial, UUID, cert subject) and user IDs to sessions.
  - Cadence: real-time webhooks for critical events; 5–15 min polling for compliance/patch; daily baseline refresh for inventory.
  - Staleness handling: mark posture as `stale_after` (e.g., 4h for compliance, 15m for EDR health); policies deny or step-up on stale data.
  - Missing data: default-deny for high-risk resources; allow with reduced scope + heightened logging for low-risk.
- **Verification**:
  - Attest device binding using client certificates or hardware keys; pin to session and rotate per login.
  - Cross-verify network claims (VPN headers vs. observed IP/ASN) and detect tampering.
  - Behavior models retrained weekly; drift detection triggers review.
- **Privacy & visibility**:
  - Tenant-scoped posture store; access controlled via least-privilege roles.
  - Pseudonymize device/user identifiers for analytics; retain raw signals per tenant data retention policy.
  - Allow tenants to opt-in for behavioral analytics and define redaction rules (e.g., SSID names, precise geo).
  - Provide auditability: who viewed posture, when decisions used posture attributes.

## 4. Artifacts

### Posture-Aware Access Model v0 (outline)

1. Objectives and trust principles
2. Posture attributes (device, network, session) and scoring
3. Assurance tiers and required posture combinations
4. Enforcement points (SSO proxy, API gateway, admin consoles) and decision flow
5. Step-up and continuous evaluation lifecycle
6. Exception and break-glass governance
7. Telemetry, audit, and privacy controls
8. Operational runbooks (staleness, outages, false positives)

### Example policies

- **Privileged console login**: `allow` only if `device.managed && device.compliant && device.risk_score < 30 && network.trusted && vpn.active && behavior_score > 50 && posture.fresh < 2h`; else require WebAuthn + manager approval.
- **Source code download**: deny on public networks unless VPN is active and device risk_score < 40; require file-level watermarking and session revalidation every 30 minutes.
- **Customer data export**: require Tier 1 posture plus DLP client present; block if device missing disk encryption or if ASN/geolocation changes mid-session.
- **Internal wiki read-only**: permit with registered device and risk_score < 70; insert CAPTCHA if behavior deviates >3σ from baseline.

### Checklist: posture-aware control is safe and reliable if…

- Posture data freshness is enforced with explicit `stale_after` per signal and evaluated on every decision path.
- Critical actions have defined assurance tiers and step-up rules bound to posture deltas.
- Exceptions are time-bound, reviewed, and logged with owners; break-glass endpoints are isolated and audited.
- Device/session binding is attested (cert or hardware key) and rechecked on network change.
- Network claims are corroborated (VPN headers vs. IP/ASN) and anomalies raise risk_score or block.
- Policy engine (OPA/ABAC) receives normalized posture attributes with defaults for missing data.
- Tenant privacy controls are applied (pseudonymization/redaction) and posture access is least-privilege.
- Monitoring includes posture ingestion health, decision outcomes by posture, and false-positive review loops.
