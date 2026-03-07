# Abuse & Misuse Detection Model v0

## Mission and Principles

- Intercept abusive or policy-violating behavior early while minimizing friction for legitimate customers.
- Favor layered controls: preventive guardrails first, then detective controls with graduated responses.
- Design for auditability: every decision (block, allow, throttle) is explainable and evidence-linked.

## Taxonomy

### Categories

- **Account takeover (ATO):** credential stuffing, MFA bypass, device posture anomalies, suspicious session hijack.
- **Privilege abuse:** unusual role changes, privilege escalations, delegated admin misuse, disabled security features.
- **Data exfiltration:** bulk exports, unusual download patterns, mass report/API queries, unapproved destinations (e.g., personal cloud).
- **Misconfigurations:** public sharing toggles, broad access grants, disabled logging, relaxed network/IP policies.
- **Automated scraping/overuse:** scripted crawling, aggressive API usage, headless browser behavior, token reuse across IPs.

### Observable Signals

- **Access anomalies:** unfamiliar geo/device/ASN, impossible travel, abnormal login hour, repeated policy-denied attempts.
- **Authorization drift:** rapid role/ACL changes, privilege escalation chains, creation of shadow admins, policy overrides.
- **Data movement:** spikes in export/download volume, high-entropy destinations, repeated export retries, off-hours data pulls.
- **Automation fingerprints:** low think-time, identical user-agent across accounts, missing telemetry (JavaScript disabled), replayed tokens.
- **Integrity warnings:** tampered web SDK signals, disabled audit hooks, degraded coverage from logging agents.

### Severity Levels & Response Expectations

- **Critical:** confirmed exfiltration, active ATO with session control, deliberate control-plane tampering. _Response:_ immediate block/containment, session revocation, exec on-call, legal hold.
- **High:** strong indicators without full confirmation (e.g., anomalous export + risky destination). _Response:_ step-up auth, throttle, initiate investigation, notify customer security contact.
- **Medium:** suspicious but explainable patterns (e.g., new country + small export). _Response:_ risk-based challenge, increased logging, queue for analyst triage.
- **Low:** noisy or isolated events (single failed policy attempt). _Response:_ alert enrichment only; no customer impact.

## Detection Framework

### Detector Types

- **Rule-based policies:** geolocation allowlists/denylists, export volume thresholds, admin-action safelists, API rate caps, device posture requirements.
- **Behavioral/anomaly models:** peer-group baselines for export volume, login cadence models, sequence models for admin workflows, device+network reputation scoring.
- **Composite detections:** correlation of login anomaly + export spike + destination risk; privilege escalation followed by audit-log disable.

### Correlation with Intelligence Fabric

- **Entity graph:** link users, devices, IPs/ASNs, tokens, API keys, tenants, data assets; compute blast radius for privileged sessions.
- **Reputation overlays:** known bad IPs/domains, compromised device IDs, leaked credential indicators, previous incident labels.
- **Temporal chaining:** sliding windows for multi-stage attacks (login → privilege change → export → deletion).

### Tuning & Quality

- **False-positive reduction:** per-tenant baselines, maintenance windows, partner IP safelists, suppression of self-initiated recovery flows.
- **False-negative reduction:** adversarial simulations (ATO kits, scripted exports), red-team replay, canary accounts, coverage SLOs per category.
- **Lifecycle:** detectors versioned with owners; change management requires offline eval + shadow mode + staged rollout; metrics include precision/recall, MTTR, customer friction rate.

## Response Workflows

### Automated Controls

- **Block/contain:** kill sessions, rotate keys, revoke refresh tokens, disable risky integrations, quarantine exports.
- **Throttle/step-up:** rate-limit exports, add CAPTCHA or WebAuthn, restrict to read-only until review.
- **Notify:** in-product banners, security contact email/webhook, SIEM forwarding.

### Human-in-the-Loop

- **Investigation:** pivotable case in case-management with timeline, linked entities, policy snapshots, raw evidence.
- **Collaboration:** Slack/Teams bridge with on-call runbooks; customer comms templates for ATO, export anomalies, and admin misuse.
- **Escalation:** SEV rubric aligned to severity levels; executive/IR/legal engagement at High/Critical.

### Evidence & Compliance

- Immutable event/decision log (policy evaluated, inputs, decision, actor, time).
- Storage of artifacts: HTTP/API traces, screenshots, export manifests, config diffs, detector version.
- Legal hold flag to prevent retention-policy deletion; audit-ready chain of custody.

## Example Detection & Response Flows

### Scenario 1: Suspicious Export

1. **Detect:** Export volume >5× baseline within 30 minutes from new ASN; destination domain not in allowlist.
2. **Automated response:** throttle export API; require WebAuthn; quarantine payload; alert Intelligence Fabric for entity graph expansion.
3. **Investigation:** analyst reviews session path (login → export), correlates device fingerprint, checks prior exports; if malicious, block account and notify customer security contact.
4. **Closure:** capture artifacts (request logs, payload hashes), update detector precision notes, lift throttle after validation.

### Scenario 2: Unusual Admin Actions

1. **Detect:** Admin role change followed by logging disable and bulk sharing permission changes within 10 minutes.
2. **Automated response:** freeze further admin changes, require step-up auth, snapshot configs, and force audit logging to remain enabled.
3. **Investigation:** confirm actor legitimacy via recent HR/IT changes, review IP/device reputation, compare to peer admin behavior.
4. **Closure:** restore intended configs, rotate credentials if needed, file post-incident report and update rule safelists.

## Checklist: Detector is Safe and Useful If…

- Has clear owner, severity mapping, and documented hypothesis.
- Evaluated in shadow mode with baseline metrics; precision/recall ≥ target; customer friction monitored.
- Supports explainability: decision inputs captured; customer-friendly reason codes.
- Has playbooks for block/challenge/allow; auto-rollbacks for noisy deployments.
- Covered by observability: alerting, dashboards, detector health checks, and pager thresholds.
- Integrated with evidence store, case management, and legal hold toggles.
- Includes feedback loop: analyst labeling feeds back into model/rule tuning.
