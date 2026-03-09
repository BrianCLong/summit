# Summit Outreach Sequences

**Purpose:** Ready-to-use email and LinkedIn sequences for each ICP segment. Copy, personalize variables, and send.

_Version: 2025-11-27_

---

## Sequence Structure

Each sequence follows a 3-touch + 1 breakup pattern over ~3 weeks:

| Touch | Timing | Purpose |
|-------|--------|---------|
| Email 1 | Day 0 | Problem + mission hook |
| Email 2 | Day 3-5 | Use case + social proof |
| Email 3 | Day 10-12 | Direct ask + low-friction next step |
| Email 4 (Breakup) | Day 18-21 | Permission to close loop |

**Variables to personalize:**
- `{{First}}` — Contact first name
- `{{Org}}` — Organization name
- `{{Unit}}` — Specific unit/division
- `{{Role}}` — Their role/title
- `{{Mission}}` — Specific mission area
- `{{Pain}}` — Observed pain point
- `{{Trigger}}` — Triggering event (RFI, incident, budget)

---

## Sequence A: Gov / Defense / Intel Mission Teams

**Target:** Directors, Chiefs, J2/G2 leads, Fusion Center commanders, Mission owners

### Email 1 — Problem + Mission Hook

**Subject:** Bringing provenance-first AI into your analysts' workflows

Hi {{First}},

You've got analysts swimming in OSINT, reports, and sensor data—but the tools they use were built for search, not for **explainable, policy-gated AI**.

Summit is an **analyst workbench** used to fuse OSINT and all-source data into a single graph/timeline/map, with full provenance and audit. Analysts can ask natural-language questions, generate hypotheses, and still enforce classification and data-handling rules.

For a team like {{Org}}/{{Unit}}, that typically shows up as:

- Faster triage of incoming reports and tips
- Clearer chains-of-custody for decisions
- Less swivel-chair between disconnected tools

Would you be open to a 25-minute conversation to see how other mission teams are structuring 8–12 week pilots around this?

Best,
{{Sender}}
{{Title}}

---

### Email 2 — Use Case + Social Proof

**Subject:** How intel teams are piloting provenance-first AI safely

Hi {{First}},

Quick follow-up with a more concrete example.

A peer intel team recently scoped an 8-week pilot with Summit around one mission question:

> "Can our analysts cut time-to-answer for priority cases in half, **without** relaxing our data-handling rules?"

We connected a handful of OSINT and internal sources into Summit, gave 15 analysts access to the workbench (graph + timeline + map), and enforced their classification and redaction policies via policy-as-code.

By the end of the pilot they had:

- Shortened their analytic cycle for key cases
- A repeatable way to show **who saw what, when, and under which rules**
- A roadmap to roll out to more missions without starting from scratch

If there's a mission thread in {{Org}} where this is already a headache, a short working session to map a potential pilot could be useful. How does {{Date1}} or {{Date2}} look?

Best,
{{Sender}}

---

### Email 3 — Direct Ask + Low-Friction Next Step

**Subject:** Worth a quick working session on analyst workflows?

Hi {{First}},

If now isn't a good time to look at analyst workbench options, I'll stop chasing you.

If it is a live topic, here's a very lightweight next step:

- **15-minute call** to understand where OSINT/all-source workflows are slow or risky today
- We come back with a **1-page pilot concept** tailored to {{Org}} (scope, timeline, not a sales deck)

No obligation beyond that. Would {{Date}} work, or is there someone else on your team (e.g., {{AlternateRole}}) I should coordinate with?

Best,
{{Sender}}

---

### Email 4 — Breakup

**Subject:** Closing the loop

Hi {{First}},

Haven't heard back, so I'll assume the timing isn't right for {{Org}} to look at analyst workbench options.

If that changes—especially if you're facing:
- A modernization deadline
- An audit or compliance push
- A new mission thread that needs OSINT fusion

—feel free to reach out. Happy to pick this back up whenever it makes sense.

Best,
{{Sender}}

---

### LinkedIn DM (Short)

Provenance-first **intel graph + policy-gated AI** — tri-pane UI (graph/timeline/map). Happy to show how teams cut time-to-insight ~40% with full audit trails. 15–20 min?

---

## Sequence B: Primes / Systems Integrators

**Target:** Capture managers, Program managers, Solution architects, Technical directors

### Email 1 — Co-Sell Angle

**Subject:** Graph + AI substrate for your intel programs

Hi {{First}},

I work with Summit, a graph + AI workbench built for intel and investigation programs.

Many primes we talk to end up **rebuilding the same substrate**—graph, provenance, policy enforcement, and AI orchestration—on each new program. It drives cost and risk in both capture and delivery.

Summit gives you a reusable substrate you can:

- Drop under existing UIs and workflows, or
- Present as a differentiator in new bids (provenance-first AI, explainability, SBOM/SLSA story, etc.)

Could we spend 20 minutes mapping where your current intel/analytics pursuits might benefit from a COTS substrate instead of another custom build?

Best,
{{Sender}}
{{Title}}

---

### Email 2 — Pursuit-Specific Hook

**Subject:** Using Summit in your {{Agency}}/{{Program}} pursuits

Hi {{First}},

Following up with a more concrete angle.

For pursuits like {{Program}}, primes are being asked to show:

- Explainable AI, not just dashboards
- Strong data governance (ABAC/OPA, DLP, audit)
- A credible path to ATO / FedRAMP alignment

Summit already has those building blocks baked in. You bring mission knowledge and delivery muscle; we provide the substrate that makes your proposal cleaner and your delivery faster.

Would you be open to a **joint working session** with your solution architect to look at {{Program1}} or {{Program2}} and see whether Summit fits?

Best,
{{Sender}}

---

### Email 3 — Partnership Framing

**Subject:** Partnering vs. building your own graph/AI platform

Hi {{First}},

If you've already standardized on an internal platform for these needs, I don't want to create noise.

If not, there are usually three options we see primes take:

1. **Custom build** each time (flexible, but high cost and risk)
2. **Extend a legacy BI/search tool** beyond what it was designed to do
3. **Adopt a focused substrate** like Summit for graph, AI, provenance, and policy

We typically start with a **single co-developed reference architecture and demo environment** that your teams can reuse in capture.

If that's worth a look, what's the best way to sync with you and your chief architect?

Best,
{{Sender}}

---

### Email 4 — Breakup

**Subject:** Should I close this out?

Hi {{First}},

I haven't been able to connect, so I'll assume either (a) you've got this covered internally or (b) timing isn't right.

If a pursuit comes up where you need compliant graph/AI without the custom build overhead, happy to jump back in. We're also building out a formal partner program with referral and resell tiers if that's ever interesting.

Best,
{{Sender}}

---

### LinkedIn DM (Short)

We help primes deliver compliant graph/AI faster (provenance, ABAC/OPA, NL-to-graph). Have a pursuit we should backstop? Happy to do a quick fit call.

---

## Sequence C: Regulated Enterprise — Threat Intel / Fraud

**Target:** Heads of Threat Intel, Fraud, CSIRT, Security Engineering

### Email 1 — Value + Ask

**Subject:** Verified AI for threat intel and fraud graphs

Hi {{First}},

We help security and fraud teams unify their feeds—dark web, OSINT, vendor intel, internal logs—into a single **verifiable graph** with timeline and map views.

Instead of swivel-chairing between tools, analysts get:

- **Natural-language queries** against the graph (no Cypher required)
- **Full provenance** on every answer (who saw what, when, from which source)
- **Policy enforcement** (DLP, redaction, audit logs) that satisfies compliance

For {{Org}}'s {{Unit}} team, this typically helps with:

- Faster triage of incoming intel
- Clearer evidence packages for escalation
- Audit-ready documentation without extra work

Worth a 20-minute look?

Best,
{{Sender}}
{{Title}}

---

### Email 2 — Use Case + Compliance

**Subject:** How threat intel teams are handling explainability and audit

Hi {{First}},

Following up with a specific angle.

Boards and regulators are increasingly asking threat intel and fraud teams to show **how** they reached conclusions—not just what they found. "Trust us" doesn't cut it anymore.

Summit is built provenance-first:

- Every fact traced to source
- Every analyst action logged
- Every AI-assisted answer explainable

One team we work with reduced their time spent on post-incident documentation by 60% because the audit trail was already built into their workflow.

If {{Org}} is facing similar pressure, a quick working session to map a pilot could be useful. How does {{Date1}} or {{Date2}} look?

Best,
{{Sender}}

---

### Email 3 — Direct Ask

**Subject:** Quick pilot scoping call?

Hi {{First}},

Trying once more—if threat intel or fraud graph tooling isn't a priority right now, I'll stop reaching out.

If it is, here's the lowest-friction next step:

- **20-minute call** to understand your current stack and pain points
- We come back with a **1-page pilot concept** (scope, data sources, success criteria)

No obligation. Would {{Date}} work, or is there a better person on your team to connect with?

Best,
{{Sender}}

---

### Email 4 — Breakup

**Subject:** Closing the loop on threat intel tooling

Hi {{First}},

Assume this isn't the right time. If that changes—especially if you're facing:

- A new regulatory audit
- An incident that exposed gaps in your intel fusion
- Budget for security tooling consolidation

—feel free to reach out. Happy to pick up whenever it makes sense.

Best,
{{Sender}}

---

### LinkedIn DM (Short)

We unify threat intel feeds into a verified **graph + timeline + map**—with full provenance and audit. Helping security teams get explainable answers fast. Worth a 15-min look?

---

## Sequence D: Warm Intro / Referral Follow-Up

**Target:** Contacts introduced by existing relationships

### Email 1 — Referral Hook

**Subject:** {{Referrer}} suggested we connect

Hi {{First}},

{{Referrer}} mentioned you might be dealing with {{Pain}} and thought Summit could be relevant.

Quick background: Summit is a provenance-first analyst workbench—graph + timeline + map, with policy-gated AI. Teams use it to fuse OSINT and all-source data while keeping full audit trails.

{{Referrer}} thought there might be a fit for {{Org}}'s work on {{Mission}}.

Would you be open to a 20-minute conversation to see if that's true?

Best,
{{Sender}}

---

### Email 2 — Follow-Up

**Subject:** Following up on {{Referrer}}'s intro

Hi {{First}},

Just bumping this—wanted to make sure it didn't get buried.

If there's a better time or a different person I should connect with, happy to adjust. Otherwise, a quick call to explore fit would be great.

Best,
{{Sender}}

---

## Sequence E: Event / Conference Follow-Up

**Target:** Contacts met at conferences, webinars, or events

### Email 1 — Event Hook

**Subject:** Good meeting you at {{Event}}

Hi {{First}},

Good connecting at {{Event}}. Our conversation about {{Topic}} stuck with me—sounds like {{Org}} is dealing with some real challenges around {{Pain}}.

As I mentioned, Summit is a provenance-first analyst workbench (graph + timeline + map) with policy-gated AI. It's built for exactly the kind of OSINT/all-source fusion and compliance challenges you described.

Would you be open to a follow-up call to dig deeper? I can show you a quick demo tailored to {{Mission}}.

Best,
{{Sender}}

---

### Email 2 — Demo Offer

**Subject:** Quick demo based on our {{Event}} conversation?

Hi {{First}},

Following up from {{Event}}. I put together a short demo scenario based on what you described—should take 20 minutes and will give you a concrete sense of how Summit handles {{UseCase}}.

Would {{Date1}} or {{Date2}} work?

Best,
{{Sender}}

---

## Call Scripts (Discovery)

### Opening (30 seconds)

> "Thanks for making time. My goal today is to understand where your team's workflows are slow or risky—specifically around [OSINT fusion / threat intel / graph analytics]. If there's a fit, I'll follow up with a 1-page pilot concept. If not, I'll tell you. Sound good?"

### Discovery Questions

**Current State:**
1. "Walk me through how your analysts handle a typical [case / investigation / alert] today."
2. "What tools are they using? Where do they spend the most time?"
3. "When something needs to go to [leadership / legal / oversight], what does that process look like?"

**Pain Points:**
4. "Where do things break down or slow down?"
5. "What happens when you can't trace how a conclusion was reached?"
6. "Have you had any audit findings or compliance gaps in the last 12 months?"

**Decision Process:**
7. "If you wanted to pilot something like this, what would that process look like?"
8. "Who else would need to be involved?"
9. "What budget/timeline constraints should I know about?"

### Closing

> "Based on what you've shared, here's what I'm thinking for a potential pilot scope: [summarize]. I'll send over a 1-page concept by [date]. If it looks right, we can schedule a working session with your team. Sound reasonable?"

---

## Objection Handling

| Objection | Response |
|-----------|----------|
| "We already have tools for this" | "Makes sense. What we usually hear is that existing tools handle search well but struggle with provenance and policy enforcement. Is that a gap, or do you have that covered?" |
| "We're building internally" | "Got it. How far along is that? We've seen some teams use Summit as the substrate to accelerate their build—keeping the custom parts custom and not reinventing graph/provenance." |
| "Budget is tight" | "Understood. Our pilots are scoped to prove value in 8-12 weeks. If we can show [specific metric], would that change the budget conversation?" |
| "We need FedRAMP" | "We're on a FedRAMP High path. In the meantime, we've supported ATOs in [deployment pattern]. Happy to walk through our compliance posture with your security team." |
| "Not the right time" | "When would be a better time to revisit? Any specific triggers—budget cycle, audit, new mission—that would make this more urgent?" |

---

## Metrics & Tracking

Track in CRM:

| Metric | Target |
|--------|--------|
| Email open rate | > 40% |
| Reply rate | > 8% |
| Meeting book rate | > 3% of outreach |
| Sequence completion | > 90% (don't abandon early) |
| Time to first reply | < 5 days |

**A/B Test Candidates:**
- Subject lines (problem vs. outcome)
- Email length (short vs. detailed)
- CTA (specific time vs. "let me know")
- Social proof (named vs. anonymized)

---

_Version: 2025-11-27 | Update quarterly or when messaging shifts_
