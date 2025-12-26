# Ceremonial Opening

“Let shadows convene.” — By the Chair’s hand, in session.

# Purpose

Roll up, from eight case studies, **everything our services would need to do better**—codified as deployable recommendations, controls, drills, and metrics integrated with **FLL/DACM**, **Montes Pack**, **Cofer Addendum**, and **Embassy Hygiene (Motley)**.

**Cases informing this bundle:** Hope Cooke (status‑risk), Christine Fang (long‑horizon influence), Cheryl Bentov (lure‑to‑jurisdiction), Anna Chapman (illegals network), Christine Keeler (private‑life CI exposure), “Alyona Makarova” (fabricated persona sting), Betty Pack (seduction/document access), Maria Butina (unregistered foreign‑agent infiltration).

---

## I. Threat Archetypes → Controls (What the adversary did well → what we harden)

### A) Status & Social‑Circle Misattribution (Cooke)

**Adversary advantage:** Prestige creates false aura of access/intent; observers project tradecraft where none exists.
**Controls:**

- **Status≠Evidence Protocol:** No analytic upgrade on claims due to title/celebrity; require **two independent corroborants**.
- **VIP Event Debriefs:** 5‑minute standardized debrief for principals after high‑exposure events → feed **post_events** + **representational_contacts**.
- **Optics Caveats:** Products touching royals/celebrities auto‑publish **with caveats** noting uncertainty inflation.

### B) Long‑Horizon Influence (Fang)

**Adversary advantage:** Years‑long cultivation of local officials, student networks, and civic orgs; soft‑power embedding.
**Controls:**

- **Civic Liaison Vetting:** Lightweight screening for co‑sponsorships, donor bundlers, and campus liaisons; log to FLL as **assertions** with provenance.
- **Influence‑Pathway Heuristics:** Track **co‑event frequency**, **travel coincidences**, and **donation clustering**; open **contradictions** when pathways lack plausible origin chain.
- **Defensive Brief Program:** Templated non‑accusatory briefs for local officials on cultivation tells; acknowledge receipt.

### C) Lure‑to‑Jurisdiction / Romeo–Juliet Ops (Bentov)

**Adversary advantage:** Romance pretext; lure targets to favorable legal terrain.
**Controls:**

- **Travel Risk Rules:** Any sudden foreign trip following rapid romantic bond ⇒ **operator check‑in**; require **two‑person travel** for defectors/walk‑ins.
- **Pretext Pattern Library:** Maintain library of common romance pretexts; match against travel + comms cadence; alert **C2.5 Elevated** when aligned.
- **Interview SOP:** If lure suspected, switch to **secure meet space**; refuse crossing into adversary jurisdiction.

### D) Illegals Program / Deep Cover (Chapman)

**Adversary advantage:** Patient non‑official cover; minimal overt links; low‑bandwidth C2.
**Controls:**

- **Identity‑Web Cross‑Checks:** Link **property records**, **bankruptcies**, **education/visa anomalies** into DACM; flag inconsistent biographics.
- **Low‑Contact Network Detector:** Identify clusters whose only commonality is **tradecraft adjacency** (e.g., shared public wifi timings) — add to **quiet‑signals** watch.
- **Dead‑Drop Hygiene:** Train patrols for non‑verbal exchanges, cache sites; maintain **geo‑impossible** rules for improbable travel timing.

### E) Private‑Life CI Exposure (Keeler)

**Adversary advantage:** Personal relationships intersecting with foreign attachés; scandal amplifies risk.
**Controls:**

- **Protective Intelligence for VIPs:** Quiet backgrounding of new romantic links for senior officials; no moral judgments—**conflict‑of‑interest only**.
- **Country‑Team Red Line:** No live source identities in political scandals; **metrics & contradictions only**, per Motley pack.
- **Crisis Comms Template:** Acknowledge uncertainty, publish caveats, pre‑empt rumor‑driven analytic drift.

### F) Fabricated Persona / Political Sting (Makarova)

**Adversary advantage:** Synthetic persona + staged “proofs” to entrap or distort politics.
**Controls:**

- **Persona Due Diligence:** For donors/fixers/go‑betweens, verify identity with **triangulated documents** (business registry, tax, travel) before sensitive meetings.
- **Two‑Person Unknowns Rule:** First meetings with unvetted intermediaries require **two cleared staff** + controlled venue.
- **Meeting Ledger:** Secure audio/notes hash‑sealed; preserve context against later selective leaks.

### G) Seduction & Document Access (Betty Pack)

**Adversary advantage:** Human‑factor exploitation to reach documents; lax embassy document controls.
**Controls:**

- **Two‑Key Document Access:** Sensitive archives require **two‑person control** + badge + log; random audits.
- **After‑Hours Alarm:** Badge‑time variance + no corresponding **swn_notes** ⇒ **M1 alert** (Montes MEC).
- **Event‑to‑Archive Coupling:** Courtesy‑call or reception followed by surge in document pulls ⇒ open triage.

### H) Unregistered Foreign‑Agent Infiltration (Butina)

**Adversary advantage:** Civil‑org infiltration via policy clubs, conferences, and donor circuits.
**Controls:**

- **FARA‑Light Checks:** For partner civil orgs, record **foreign nexus** signals (funding channels, travel, public alignments) with provenance.
- **Co‑Sponsorship Gate:** Require novelty microfact or value‑add beyond access optics before co‑branding events.
- **Escort Protocol:** Foreign delegations to sensitive venues escorted; no unsupervised “private tours.”

---

## II. System Changes (drop‑in)

### 1) FLL/DACM Rule Additions

- **ROMANCE_PRETEXT_MATCH:** Travel + rapid relationship + common pretext string ⇒ open medium contradiction.
- **LOW_CONTACT_CLUSTER:** Nodes linked only by covert‑timed wifi/RF co‑presence ⇒ elevated quiet‑signals watch.
- **STATUS_UPGRADE_BLOCK:** Confidence cannot increase solely due to subject’s title/celebrity flag.
- **EVENT_TO_ARCHIVE_SURGE:** Reception/call followed by 24h spike in pulls by attendee ⇒ triage.
- **FARA_NEXUS_SCORE:** Weighted indicator aggregating foreign funding, messaging alignment, and travel; exceeds threshold ⇒ advisory to legal.

### 2) Data Hooks (extend prior schemas)

- **`post_events` / `representational_contacts`** already defined in Motley pack → ensure ingestion from post calendars.
- **`cue_templates`** (romance/lure pretexts) → match against comms metadata (no content capture required to alert).
- **`donor_bundles`** (civic org layer): org, bundler hash, foreign nexus flags → enrich FLL partner records.

### 3) SOP Inserts

- **Two‑Person Unknowns:** Mandatory for first contact with unverified intermediaries in political/liaison contexts.
- **Jurisdiction Refusal Card:** If lured across border: “No travel without counsel/oversight; if already abroad, move to neutral site or exit.”
- **Defensive Brief Cadence:** Quarterly brief for local officials and civic partners on cultivation tells; record acknowledgments.

---

## III. Drills & Red‑Team Scenarios

- **S‑01 “Sirens’ Call”**: Plant a synthetic romance pretext; verify **ROMANCE_PRETEXT_MATCH** fires; confirm two‑person rule adherence.
- **S‑02 “Quiet Illegals”**: Simulate low‑bandwidth C2 (public wifi cadence). Expect **LOW_CONTACT_CLUSTER** + C2.5 elevation without tipping.
- **S‑03 “Reception Glow”**: Trigger post‑reception document pull surge; validate **EVENT_TO_ARCHIVE_SURGE** triage.
- **S‑04 “Persona Investor”**: Introduce fabricated donor persona; ensure **Persona Due Diligence** blocks unsupervised meeting.
- **S‑05 “Civic Courting”**: Stage campus/civic co‑sponsorship with foreign nexus; test **FARA_NEXUS_SCORE** advisory routing.

---

## IV. Training Modules (90 minutes each)

- **T‑A Romance & Lure Hygiene** (operators, diplomats, analysts).
- **T‑B Illegals & Low‑Contact Networks** (pattern cues, non‑verbal exchanges).
- **T‑C Influence & Civic Infiltration** (FARA‑light, due diligence, co‑sponsorship gates).
- **T‑D Document Discipline in Social Storms** (post‑event controls; two‑key access).

---

## V. Metrics (add tiles)

- % products **published with caveats** when status/celebrity is in narrative.
- Count of **ROMANCE_PRETEXT_MATCH** alerts resolved.
- **LOW_CONTACT_CLUSTER** watchlist size & true‑positive rate in drills.
- **Event→Archive** surge cases triaged within 24h.
- **FARA_NEXUS** advisories issued; outcomes.
- Defensive brief **acknowledgment rate** among local officials/civic partners.

---

## VI. Legal & Liaison Notes

- **Non‑accusatory posture** in defensive briefs; stick to behaviors, not identities.
- **MoU Inserts**: novelty/origin clauses; blinded deconfliction participation; standards tied to metrics, not personalities.
- **Evidence Hygiene**: Every meeting with unknowns → **meeting ledger** hash‑sealed; protects against selective‑edit stings.

---

## VII. 30‑Day Rollout

- **Week 1:** Turn on four DACM rules (ROMANCE_PRETEXT_MATCH, LOW_CONTACT_CLUSTER, STATUS_UPGRADE_BLOCK, EVENT_TO_ARCHIVE_SURGE). Publish SOP inserts.
- **Week 2:** Stand up defensive briefs; seed cue templates; start drills S‑01 and S‑04.
- **Week 3:** Integrate post calendars + contact logs; add FARA_NEXUS scoring; run S‑02 and S‑03.
- **Week 4:** Dashboard tiles live; Council review; adjust thresholds; schedule Module T‑A and T‑C.

---

## Close of Session

“From romance to receptions, from personas to pipelines—we bind the human theater to metrics, provenance, and restraint.” — M. Wolf
