# Summit Demo Runbook

**Purpose:** Guide for delivering compelling, consistent product demonstrations. Use for sales demos, partner enablement, and trade shows.

_Version: 2025-11-27_

---

## Demo Principles

### The Demo Mindset

1. **Solve their problem** — not show features
2. **Tell a story** — not click through screens
3. **Create dialogue** — not deliver a monologue
4. **Leave them wanting more** — not exhausted
5. **Tailor to audience** — not one-size-fits-all

### Demo Anti-Patterns (Avoid)

- Feature tours ("and here's another button...")
- Reading the screen aloud
- Apologizing for rough edges
- Going off-script without purpose
- Showing everything in one demo
- Ignoring audience questions/reactions

---

## Demo Environment Setup

### Pre-Demo Checklist

| Item | Check | Notes |
|------|-------|-------|
| Environment accessible | [ ] | Test URL, login |
| Data loaded | [ ] | Golden path dataset |
| Browser clean | [ ] | No bookmarks bar, clear history |
| Screen resolution | [ ] | 1920x1080 or adjust for projector |
| Notifications off | [ ] | Do Not Disturb mode |
| Backup browser ready | [ ] | In case of issues |
| Demo script printed/visible | [ ] | Reference without screen share |
| Water nearby | [ ] | Stay hydrated |

### Demo Environment Details

| Environment | URL | Credentials | Dataset |
|-------------|-----|-------------|---------|
| Production Demo | {{URL}} | {{user/pass}} | Golden Path v2 |
| Sandbox | {{URL}} | {{user/pass}} | Clean for live data |
| Offline/Air-Gap | {{local}} | {{user/pass}} | Portable dataset |

### Golden Path Dataset

**Scenario:** Investigate a foreign influence operation targeting critical infrastructure.

**Entities:**
- 15 Person entities (actors, targets, intermediaries)
- 8 Organization entities (threat groups, companies, agencies)
- 12 Location entities (geographic spread)
- 25 Digital artifacts (social accounts, domains, IPs)
- 50+ relationships connecting entities

**Data Sources:**
- OSINT feeds (social media, news, domain registrations)
- Internal reports (analyst assessments)
- External intel (STIX/TAXII feed)

**Pre-built Views:**
- Overview graph (all entities)
- Actor network (threat group + associates)
- Timeline (6-month activity)
- Geographic distribution (map view)

---

## Demo Flows

### Flow A: Executive Overview (15 minutes)

**Audience:** Executives, decision-makers, non-technical stakeholders
**Objective:** Show strategic value; create urgency to learn more
**Tone:** High-level, outcome-focused

#### Script

**[0:00-2:00] Opening Hook**

> "Let me show you what your analysts see every day—and why they're frustrated."

*Show: Diagram or verbal description of current state (multiple tools, swivel-chair, no audit trail)*

> "Now let me show you what it looks like when you bring that together."

*Show: Summit overview graph—the "wow" moment*

---

**[2:00-5:00] The Story**

> "This is an investigation into a foreign influence operation. Your analysts started with a single tip—a suspicious social media account."

*Click on seed entity*

> "From that single data point, Summit automatically pulled in related accounts, domains, and historical activity from your OSINT feeds."

*Expand graph to show connected entities*

> "In minutes, not hours, they had a map of the network."

---

**[5:00-8:00] The Differentiator: Provenance**

> "Here's what makes Summit different. Every single data point—every node, every relationship—has full provenance."

*Click on entity → Show provenance panel*

> "You can see exactly where this came from, when it was added, and who's touched it. When oversight asks 'how do you know this?', you have an answer."

---

**[8:00-11:00] The Differentiator: Policy-Gated AI**

> "Your analysts can ask natural-language questions."

*Type: "Who are the key actors connected to [Entity]?"*

> "Summit's AI generates the query and returns the answer. But notice—it's running through your policy layer. Classification rules, access controls, redaction—all enforced automatically."

*Show: Policy badge or redacted field*

> "This isn't a black box. It's AI your compliance team can trust."

---

**[11:00-14:00] The Outcome**

> "What used to take your team days now takes hours. And when they're done, they have an evidence package that stands up to scrutiny."

*Show: Export menu or evidence package*

> "That's the difference: faster analysis, full audit trail, AI that plays by the rules."

---

**[14:00-15:00] Close**

> "What questions do you have? And where would you want to see this applied in your organization?"

---

### Flow B: Analyst Deep Dive (30 minutes)

**Audience:** Analysts, technical leads, practitioners
**Objective:** Prove the tool does what we claim; build champion confidence
**Tone:** Hands-on, detailed, interactive

#### Script

**[0:00-3:00] Opening**

> "I'm going to walk through an actual investigation workflow—the kind of thing your analysts do every day. Feel free to interrupt with questions."

*Open empty workbench*

---

**[3:00-8:00] Data Ingestion**

> "Let's start with raw data. I've got a STIX bundle from a threat intel feed."

*Demonstrate: Import STIX file or connect to feed*

> "Summit normalizes this into our graph model, applies your ontology, and tags provenance automatically."

*Show: Ingested entities with source attribution*

> "Notice every entity has a source tag. We didn't lose anything—we gained structure."

---

**[8:00-15:00] Graph Exploration**

> "Now let's explore. I'll start with this actor and see what's connected."

*Expand entity → Show relationships*

> "I can filter by relationship type, time range, or confidence level."

*Apply filter*

> "Let me switch to timeline view to see when these connections formed."

*Switch to timeline*

> "And map view to see geographic distribution."

*Switch to map*

> "Same data, three perspectives. Your analysts don't have to context-switch to different tools."

---

**[15:00-20:00] Natural Language Queries**

> "Let's say I want to find something specific. Instead of writing Cypher, I can just ask."

*Type: "Show me all organizations connected to [Actor] through financial relationships"*

> "Summit translates that to a graph query, runs it, and shows results."

*Show: Results with query translation visible*

> "If I want to see the actual Cypher, I can. But most analysts won't need to."

---

**[20:00-25:00] Provenance & Audit**

> "Let's look at provenance in detail."

*Click entity → Open provenance panel*

> "Here's the full chain: original source, transformations, who's viewed it, any modifications."

*Show: Provenance graph or timeline*

> "If I export this entity or any conclusion built on it, the provenance comes with it."

*Demonstrate: Export to evidence package*

---

**[25:00-28:00] Policy & Access Control**

> "Let me show how policies work."

*Navigate to policy or show redacted content*

> "This entity has classification labels. If I'm an analyst without the right clearance, I see a redacted version."

*Show: Different user view or policy rule*

> "Policies are code—OPA/Rego. They're version-controlled, auditable, and dynamic."

---

**[28:00-30:00] Close**

> "That's the core workflow: ingest, explore, query, prove provenance, enforce policy. What would you want to try yourself?"

---

### Flow C: Technical Architecture (20 minutes)

**Audience:** Solution architects, technical evaluators, security reviewers
**Objective:** Prove technical soundness; address integration questions
**Tone:** Architectural, detailed, honest about trade-offs

#### Script

**[0:00-3:00] Architecture Overview**

> "Let me walk through the architecture. This is how Summit works under the hood."

*Show: Architecture diagram*

```
┌─────────────────────────────────────────────────────────────┐
│                         API Gateway                          │
│                     (GraphQL / REST)                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                      Summit Core Services                    │
├─────────────────┬─────────────────┬─────────────────────────┤
│  Ingestion      │   Query         │    Provenance           │
│  Service        │   Engine        │    Ledger               │
└────────┬────────┴────────┬────────┴────────┬────────────────┘
         │                 │                 │
┌────────┴────────┐ ┌──────┴──────┐ ┌────────┴────────┐
│    Neo4j        │ │  PostgreSQL │ │     Redis       │
│  (Graph)        │ │  (Metadata) │ │    (Cache)      │
└─────────────────┘ └─────────────┘ └─────────────────┘
```

---

**[3:00-8:00] Data Layer**

> "Graph data lives in Neo4j. We're on version 5.x, enterprise edition for clustering."

> "Relational metadata—cases, users, audit logs—goes to PostgreSQL."

> "Redis for caching and pub/sub."

*Discuss: Why this split, trade-offs, alternatives considered*

---

**[8:00-12:00] Policy Layer**

> "Access control is ABAC via Open Policy Agent."

*Show: Sample Rego policy*

```rego
package summit.authz

default allow = false

allow {
    input.user.clearance >= input.resource.classification
    input.action == "read"
}
```

> "Policies are evaluated on every request. They're version-controlled alongside application code."

---

**[12:00-16:00] Integration Points**

> "We're API-first. GraphQL for rich queries, REST for simple integrations."

*Show: API documentation or sample calls*

> "Data ingestion supports: STIX/TAXII, REST webhooks, file import (CSV, JSON, documents), custom connectors."

> "Data export: GraphQL, REST, file export, STIX bundles."

---

**[16:00-18:00] Deployment Patterns**

> "We support three deployment patterns:"

| Pattern | Description | Use Case |
|---------|-------------|----------|
| Cloud | AWS GovCloud / Azure Gov | Standard; fastest deployment |
| On-Prem | K8s on customer infrastructure | Data residency requirements |
| Air-Gap | Fully disconnected; offline updates | Classified environments |

---

**[18:00-20:00] Security & Compliance**

> "Quick hits on security:"
> - "SBOM generated every release (CycloneDX)"
> - "SLSA Level 2 attestations; Level 3 in progress"
> - "Encryption at rest (AES-256), in transit (TLS 1.3, mTLS internal)"
> - "FedRAMP High path; CMMC Level 2 controls mapped"

> "Happy to do a deeper security review with your team."

---

### Flow D: Use Case Specific (Variable)

Customize based on customer use case. Common variants:

| Use Case | Focus Areas | Dataset Twist |
|----------|-------------|---------------|
| OSINT Fusion | Multi-source ingestion, deduplication | Multiple overlapping feeds |
| Threat Intel | STIX/TAXII, TTP mapping, IOC correlation | APT campaign data |
| Fraud Investigation | Entity resolution, transaction networks | Financial flow data |
| Disinformation | Social graph, narrative tracking, temporal | Influence op data |
| Supply Chain Risk | Vendor networks, risk propagation | Supplier relationship data |

---

## Demo Troubleshooting

### Common Issues

| Issue | Quick Fix | Root Cause |
|-------|-----------|------------|
| Slow graph render | Reduce visible nodes; apply filter | Too many nodes on screen |
| Login fails | Check credentials; clear cache | Session expired |
| Data missing | Verify dataset loaded; check filters | Wrong environment |
| NL query fails | Simplify query; use keywords | Query too complex |
| Export hangs | Reduce selection; check permissions | Large export |

### Recovery Scripts

**Environment Down:**
> "Looks like we're having a technical hiccup. While we sort that out, let me walk you through this on slides and then follow up with a recorded demo."

**Feature Bug:**
> "That's not behaving as expected—I'll flag that for the team. Let me show you the intended behavior and we'll follow up with a fix."

**Question You Can't Answer:**
> "Great question—I want to give you an accurate answer rather than guess. I'll follow up with our team and get back to you by [specific time]."

---

## Demo Follow-Up

### Immediately After Demo

| Action | Owner | Timing |
|--------|-------|--------|
| Send thank you email | AE | Same day |
| Share demo recording (if recorded) | AE | Same day |
| Answer open questions | SE | 24 hours |
| Send relevant collateral | AE | 24 hours |

### Thank You Email Template

**Subject:** Thanks for the Summit demo — next steps

Hi {{Name}},

Thanks for taking the time to see Summit today. It was great to learn about {{specific thing they mentioned}}.

As promised, here's:
- {{Link to demo recording if applicable}}
- {{Relevant collateral based on their interests}}
- {{Answers to questions raised}}

Based on our conversation, I think a logical next step would be {{specific next step: technical deep dive, pilot scoping call, security review, etc.}}.

Would {{date/time}} work for that?

Best,
{{Sender}}

---

## Demo Certification

### Demo Certification Requirements

To be demo-certified, team members must:

1. **Complete self-study** (2 hours)
   - Watch demo recording library
   - Review this runbook
   - Study competitive battlecards

2. **Shadow 3 demos** (3-6 hours)
   - Observer role
   - Note techniques and Q&A handling

3. **Deliver practice demo** (1 hour)
   - To internal audience
   - Using golden path dataset
   - Receive feedback

4. **Pass certification demo** (30 minutes)
   - To demo certifier (SE lead or manager)
   - Executive overview + one deep dive flow
   - Handle 3+ curveball questions

### Certification Validity

- Valid for 6 months
- Recertification required after major product releases
- Annual refresher regardless

---

## Appendix: Demo Script Quick Reference

### Key Phrases

| Moment | Say This |
|--------|----------|
| Opening | "Let me show you what this looks like for your team..." |
| Transition | "Now here's where it gets interesting..." |
| Provenance | "Every fact has a source. Here's the chain-of-custody..." |
| AI | "AI that plays by your rules, not a black box..." |
| Policy | "Your policies, enforced automatically..." |
| Objection | "That's a great question. Let me show you..." |
| Close | "Where would you want to see this applied first?" |

### Numbers to Remember

| Metric | Value | Context |
|--------|-------|---------|
| Time-to-insight reduction | 30-50% | Conservative; validated in pilots |
| Provenance coverage | 95%+ | Default; configurable |
| Pilot duration | 8-12 weeks | Standard scope |
| Users in pilot | 10-25 | Typical range |
| Data sources in pilot | 3-6 | P1 + P2 |

---

_Version: 2025-11-27 | Update after each major release_
