# Sector-by-Sector Countermeasure Package

This document outlines defense-focused countermeasures aligned to specific threats (deep-cover HUMINT, 24-hour zero-day tempo, proxy ecosystem churn, “barracks internet,” and narrative warfare).

---

## Defense Sector (DoD/NATO-adjacent, primes, labs, acquisition, planning staffs)

### 1) Counter-HUMINT & Insider Risk: shift from “clearance” to “epistemic integrity”

* **Mission-critical “influence roles” inventory**: Identify positions that shape strategy/requirements (planners, policy drafts, requirements writers, program control). Treat these as *high risk* even without elevated clearance.
* **Longitudinal anomaly program** (behavior + workflow, not content):
  * abnormal document access patterns, “review” behavior, routing decisions, repeated framing edits, unusual meeting gravity
  * *Goal*: detect “slow corruption” (agenda shaping), not just copying files.
* **Two-person integrity for strategic artifacts**: Any final strategic doc requires *independent* reviewer sign-off from an org outside the author’s chain.
* **Compartmented planning environments**: Separate “strategy drafting” from open office IT. Treat it like mission systems: hardened endpoints + restricted plugins + egress control.
* **Counter-proxy liaison cell**: Establish direct liaison with national CERT + law enforcement for rapid action when insider indicators arise (because insiders will use criminal proxy logistics).

### 2) Zero-day posture: assume exploit within hours

* **“Rapid isolation” playbooks** for Office/PDF/email exploit classes:
  * pre-authorize containment: quarantine affected OU, disable risky features/org-wide toggles, block common delivery paths (WebDAV, unsigned macros, COM hijack vectors), rotate tokens.
* **Default deny for “document-borne execution”**
  * harden Office policies: block child processes, block external template loading, block WebDAV/remote content by default where feasible
  * isolate document rendering via virtualization/containerization for high-risk users (strategy, leadership, procurement).
* **Targeted “VIP/Planner hardening”**: the people who receive “consultation documents” / “briefing inputs” are the initial victims. Give them:
  * separate browsing profile/device
  * read-only viewing pipelines
  * stricter attachment controls

### 3) Supply-chain & partner exposure

* **“Third-party ingress gates”**: enforce file transfer via scanning + detonation chamber + sanitization before anything hits internal mail or collaboration.
* **Contractual security SLAs for patch/containment**: require suppliers to meet containment-time targets, not just patch windows.

---

## Cloud Sector (SaaS, infra providers, enterprise cloud teams)

### 1) “24-hour window” controls: make exploitation less profitable

* **Identity-first containment**: If a client device is popped, attacker goes for tokens.
  * short-lived access tokens, refresh token binding, device posture checks
  * rapid session revocation across IdP + SaaS in one action (single “red button”)
* **Egress control for “unexpected clouds”**: block/alert on corporate access to newly registered domains + uncommon storage providers used as C2.
  (You cited Filen.io-style patterns; the point is *“newly seen + exfil-like behavior”*, not a single domain.)
* **Attachment & link isolation** at mail gateway + browser:
  * detonation for docs
  * link rewrites + time-of-click analysis
  * WebDAV and remote template download monitoring

### 2) Resilience to proxy churn (post-takedown migration)

* **Bot/proxy-aware auth** that doesn’t break real users:
  * risk scoring based on ASN reputation + residential proxy indicators + impossible travel + device fingerprint continuity
  * step-up auth when signals converge (not blanket blocks)
* **Rate-limits that scale by identity posture**: higher rate limit for device-attested clients; low for unknown clients.

### 3) AI/agent security (because you flagged “vLLM RCE” style risk)

* **Segregate model-serving planes**:
  * treat inference servers as *untrusted compute*: no direct access to secrets, customer data stores, or build systems
  * strict network policies (deny-by-default egress; allowlist only)
* **Tool access controls for agents**:
  * scoped credentials per tool
  * explicit allowlisted operations + human approval for destructive actions
  * full audit logging + replay for agent actions

---

## Civil Society Sector (NGOs, activists, human-rights monitors, journalists in high-risk regions)

This is about **safety, continuity, and data survivability**, not “how to evade” in a tactical sense.

### 1) Plan for “Barracks Internet” segmentation

* **Offline-first operations**:
  * capture notes/media locally with encryption
  * sync opportunistically when connectivity exists
  * maintain redundant physical backups (rotating, geographically split)
* **Communication redundancy** (assume any one channel fails):
  * primary + backup messaging apps
  * pre-arranged check-in schedules
  * “if-no-contact” escalation tree
* **Data minimization**:
  * keep sensitive contact lists separated from devices used in the field
  * compartmentalize identities (role accounts vs personal)

### 2) Counter surveillance + device compromise risk

* **Device hygiene doctrine** (simple, consistent):
  * keep devices updated, remove unused apps, restrict permissions
  * avoid sideloaded apps; treat “fake app” campaigns as routine
* **Phishing resilience for “document lures”**:
  * adopt a “view-only” culture for unsolicited docs
  * use a dedicated device/profile for opening unknown material

### 3) Satellite / alternative connectivity risk management (e.g., Starlink disruptions)

* **Expect intermittent denial** (jamming, throttling, confiscation):
  * operational plans shouldn’t depend on continuous sat connectivity
  * define “burst windows” for sync
  * prioritize exfil of *small, high-value* evidence bundles first (hashes, metadata, short clips)

---

## Media Sector (newsrooms, investigative units, comms teams, platform policy)

### 1) Narrative defense: treat “truth” as an operational pipeline

* **Evidence bundle standard** for every high-impact claim:
  * source chain, timestamps, hashes, and corroboration notes
  * publish *confidence + what would change your mind*
* **Pre-bunking playbooks** for recurring adversary narratives:
  * publish “expected lies” before major events
  * maintain rapid-rebuttal templates and verified explainer assets

### 2) Protect the newsroom from 24-hour zero-day tempo

* **High-risk inbox segmentation**:
  * tips@ / leaks@ isolated processing: detonation + sanitization + air-gapped review station where feasible
* **“Newly registered domain” and “spoofed agency email” alerting**
  * newsroom mail security should flag: newly registered senders, lookalike domains, and high-risk attachment types
* **Privilege separation**:
  * reporters shouldn’t have admin rights
  * sensitive investigations stored in hardened, access-logged repositories

### 3) Platform & distribution resilience

* **Mirror strategy**:
  * multi-platform publication plan, including static mirrors
  * RSS/email lists as fallback when platforms throttle or shadow-ban
* **Audience trust instrumentation**:
  * visible corrections policy
  * provenance labels for photos/videos
  * avoid “single-source virality”—require corroboration gates before amplification

---

## Cross-Sector: The 12 Controls That Pay Off Everywhere

1. **Containment speed** (pre-authorized actions)
2. **Identity hardening** (token revocation, step-up auth)
3. **Attachment/link isolation**
4. **Newly registered domain risk scoring**
5. **Egress allowlisting where possible**
6. **Device posture checks**
7. **Privilege separation**
8. **Audit logs you can actually replay**
9. **Two-person integrity for strategic outputs**
10. **Offline-first + redundancy**
11. **Supply-chain ingress gates**
12. **Clear confidence signaling + evidence bundles**
