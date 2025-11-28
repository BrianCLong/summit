# Summit Competitive Battlecards

**Purpose:** Positioning guidance against key competitors. Use for sales prep, objection handling, and RFP responses.

_Version: 2025-11-27 | Update quarterly or when competitive landscape shifts_

---

## How to Use These Battlecards

1. **Identify competitor** mentioned or implied by prospect
2. **Review positioning** and key differentiators
3. **Prepare questions** that expose competitor weaknesses
4. **Avoid FUD** — focus on Summit strengths, not competitor attacks
5. **Validate claims** — update battlecards with field feedback

---

## Competitive Landscape Overview

```
                    ┌─────────────────────────────────────────────┐
                    │              ANALYST PRODUCTIVITY            │
                    │                     HIGH                     │
                    │                                              │
      ┌─────────────┼──────────────────────────────────────────────┤
      │             │                    ★ Summit                  │
 G    │             │                                              │
 O    │             │     Palantir ●                               │
 V    │             │                           ● i2 ANB           │
 E    │             │                                              │
 R    │             │                                              │
 N    │             │        ● Maltego                             │
 A    │             │                                              │
 N    │             │                    ● Neo4j (raw)             │
 C    │             │                                              │
 E    │             │   ● Custom Builds                            │
      │             │         (Primes)                             │
 &    │             │                                              │
      │             │                         ● Elastic/Splunk     │
 C    │             │                                              │
 O    │             │                                              │
 M    └─────────────┼──────────────────────────────────────────────┤
 P                  │              ANALYST PRODUCTIVITY            │
 L                  │                     LOW                      │
 I                  └─────────────────────────────────────────────┘
 A
 N
 C
 E
      LOW                                                    HIGH
```

---

## Battlecard #1: Palantir

### Overview

| Attribute | Palantir | Summit |
|-----------|----------|--------|
| **Primary Products** | Gotham (Gov), Foundry (Enterprise) | Analyst Workbench |
| **Target Market** | IC, DoD, large enterprise | Mission teams, primes, regulated enterprise |
| **Deployment** | On-prem, cloud, classified | Cloud, on-prem, air-gap |
| **Typical Deal Size** | $5M-$50M+ | $200k-$2M (land), expand from there |
| **Sales Cycle** | 12-24 months | 3-6 months |

### Where Palantir Wins

- **Established IC presence** — incumbency in major programs
- **Massive feature set** — broad platform capabilities
- **Forward deployed engineers** — high-touch delivery model
- **Brand recognition** — known quantity in government

### Where Summit Wins

| Dimension | Summit Advantage | Proof Points |
|-----------|-----------------|--------------|
| **Provenance-first** | Every fact traced to source; built-in, not bolted-on | Chain-of-custody export, audit logs |
| **Policy-gated AI** | ABAC/OPA enforcement on AI outputs | Classification, redaction, DLP |
| **Total cost** | 5-10x lower TCO; no FDE dependency | Pricing comparison |
| **Time to value** | 8-12 week pilots vs. 12+ month deployments | Pilot timeline |
| **Open architecture** | GraphQL, REST, STIX/TAXII; no lock-in | API documentation |
| **Mission team scale** | Right-sized for teams, not enterprises | Customer references |

### Trap Questions (Expose Palantir Weaknesses)

1. "How does Palantir handle provenance and chain-of-custody at the data element level?"
2. "What's the typical time from contract to analysts using the system productively?"
3. "How dependent is ongoing operation on Palantir's forward-deployed engineers?"
4. "What's the total cost including FDEs, infrastructure, and licenses over 3 years?"
5. "How does their AI/LLM integration handle classification and policy enforcement?"

### Objection Handling

| Objection | Response |
|-----------|----------|
| "We're already using Palantir" | "Got it. What we hear is that Palantir is great for big enterprise analytics but can be heavy for mission team workflows. Are all your analysts actually using it daily, or is it more of a reporting layer?" |
| "Palantir is the gold standard" | "They've done great work in the IC. The question is whether you need an enterprise analytics platform or a mission-focused analyst workbench. Summit is built for the analysts, not the enterprise." |
| "We can't introduce another platform" | "Understood. Summit can actually complement Palantir—we've seen teams use Summit for day-to-day analyst work while Palantir handles enterprise reporting. Or Summit can be a lower-cost alternative for specific mission teams." |

### Competitive Positioning Statement

> "Palantir is an enterprise analytics platform that requires significant investment in infrastructure, FDEs, and time. Summit is a mission-focused analyst workbench that delivers provenance-first graph analytics in weeks, not months, at a fraction of the cost. If you need analysts productive fast with full audit trails, Summit is the better fit."

---

## Battlecard #2: IBM i2 Analyst's Notebook

### Overview

| Attribute | i2 Analyst's Notebook | Summit |
|-----------|----------------------|--------|
| **Architecture** | Desktop application | Web-based, cloud-native |
| **Data Model** | Link analysis focused | Full graph + timeline + map |
| **Collaboration** | Limited (file-based) | Real-time, multi-user |
| **AI/ML** | Minimal native | Policy-gated AI, NL queries |
| **Provenance** | Manual documentation | Built-in, automated |

### Where i2 Wins

- **Established training base** — analysts know the interface
- **Incumbency** — deployed in many agencies for 20+ years
- **Offline capability** — desktop works disconnected
- **Visualization** — strong link chart visualization

### Where Summit Wins

| Dimension | Summit Advantage | Proof Points |
|-----------|-----------------|--------------|
| **Modern architecture** | Web-based, collaborative, scalable | No desktop installs |
| **Real-time collaboration** | Multiple analysts on same graph | Live updates |
| **Provenance automation** | Built-in, not manual | Export demo |
| **AI-assisted analysis** | NL queries, hypothesis generation | NL→Cypher demo |
| **API-first** | Integrate with any system | GraphQL/REST |
| **Timeline + Map** | Tri-pane, not just link charts | UI demo |

### Trap Questions

1. "How do your analysts collaborate on the same investigation in real-time?"
2. "When you need to show chain-of-custody for an analytic product, how is that documented?"
3. "How are you integrating new OSINT feeds and APIs into your analysts' workflows?"
4. "What's your strategy for AI-assisted analysis that still meets your compliance requirements?"
5. "How do analysts work when they're not at their desktop with i2 installed?"

### Objection Handling

| Objection | Response |
|-----------|----------|
| "Our analysts know i2" | "That's valuable institutional knowledge. Summit's graph visualization will feel familiar, but adds real-time collaboration, automated provenance, and AI assistance. Analysts typically get productive in a few hours." |
| "We just renewed our i2 license" | "That's fine—Summit can run alongside i2. Teams often start with Summit for new workflows while maintaining i2 for legacy. Over time, you can consolidate if it makes sense." |
| "We need offline capability" | "Summit supports disconnected operations in air-gapped deployments. What specific offline scenarios are you solving for?" |

### Competitive Positioning Statement

> "i2 Analyst's Notebook was built for a desktop-first, single-analyst era. Summit is built for modern collaborative analysis with full provenance, AI assistance, and web-based access. If your analysts need to work together in real-time with automated audit trails, Summit is the modern alternative."

---

## Battlecard #3: Custom Builds (Primes / Internal Dev)

### Overview

| Attribute | Custom Build | Summit |
|-----------|--------------|--------|
| **Development Time** | 12-24+ months | 8-12 week pilot |
| **Cost** | $2-10M+ initial; ongoing maintenance | $100k pilot; $200k+ production |
| **Risk** | High (scope creep, staff turnover) | Low (proven platform) |
| **Maintenance** | Customer responsibility | Summit responsibility |
| **Compliance** | Build from scratch | Pre-built, documented |

### Where Custom Builds Win

- **Perfect fit** — built exactly to requirements (in theory)
- **Full control** — no vendor dependency
- **IP ownership** — customer owns everything
- **Integration** — can wire into anything

### Where Summit Wins

| Dimension | Summit Advantage | Proof Points |
|-----------|-----------------|--------------|
| **Time to value** | Weeks, not years | Pilot timeline |
| **Cost** | 5-10x lower initial; predictable ongoing | TCO comparison |
| **Risk reduction** | Proven, not prototype | Customer references |
| **Compliance-ready** | SBOM, SLSA, audit logs built-in | Compliance pack |
| **Maintained** | Continuous updates; no staff dependency | Release notes |
| **Focus** | Customer focuses on mission, not platform | Resource allocation |

### Trap Questions

1. "What's your realistic timeline to get analysts productive on a new custom platform?"
2. "How are you handling provenance and audit trail requirements in your build?"
3. "What's your plan if the key developers leave mid-project?"
4. "How will you maintain and update the platform over 5+ years?"
5. "Have you accounted for SBOM, SLSA, and compliance documentation in your estimates?"

### Objection Handling

| Objection | Response |
|-----------|----------|
| "We want to own the IP" | "Understood. With Summit, you own your data and configurations. You can also extend the platform with custom components. What specific IP are you trying to create?" |
| "We've already started building" | "Got it. How far along are you? We've seen teams use Summit as the substrate to accelerate their build—keep the mission-specific parts custom, use Summit for the graph/provenance/policy layer." |
| "Our requirements are unique" | "That's what everyone says, and sometimes it's true. What specifically is unique? We've likely seen similar requirements and can show how Summit handles them." |
| "We don't want vendor lock-in" | "Completely fair. Summit is API-first—GraphQL, REST, STIX/TAXII. Your data is always exportable. We're the opposite of lock-in; we're designed to integrate." |

### Competitive Positioning Statement

> "Custom builds promise a perfect fit but deliver 12-24 month timelines, $5M+ costs, and ongoing maintenance burden. Summit delivers 80% of a custom build in 8 weeks at 10% of the cost, with continuous updates and compliance-ready from day one. Build custom where it matters; use Summit for the foundation."

---

## Battlecard #4: Maltego

### Overview

| Attribute | Maltego | Summit |
|-----------|---------|--------|
| **Primary Use** | OSINT reconnaissance | Full analyst workbench |
| **Data Model** | Transform-based | Persistent graph |
| **Collaboration** | Limited | Full multi-user |
| **Enterprise Features** | Maltego Enterprise | Built-in |
| **Provenance** | Transform history | Full chain-of-custody |

### Where Maltego Wins

- **Transform ecosystem** — large library of OSINT transforms
- **Reconnaissance focus** — purpose-built for initial recon
- **Price point** — lower entry cost
- **Community** — active user community

### Where Summit Wins

| Dimension | Summit Advantage | Proof Points |
|-----------|-----------------|--------------|
| **Full analyst workflow** | Not just recon; case management, collaboration | UI demo |
| **Persistent graph** | Data stays; not just session-based | Data model |
| **Enterprise-ready** | ABAC, audit, compliance | Security review |
| **AI-assisted** | NL queries, not just transforms | NL→Cypher demo |
| **Timeline + Map** | Tri-pane, not just graph | UI demo |
| **Provenance** | Full chain-of-custody, not just history | Export demo |

### Trap Questions

1. "How do you manage long-running investigations where data persists across sessions?"
2. "How do multiple analysts collaborate on the same investigation?"
3. "What's your approach to audit trails and provenance for compliance?"
4. "How do you handle data classification and access control?"

### Objection Handling

| Objection | Response |
|-----------|----------|
| "We already use Maltego" | "Maltego is great for recon. Summit is for the full analyst workflow—when you need to manage investigations, collaborate, and produce auditable products. They can complement each other." |
| "Maltego is cheaper" | "For individual recon work, yes. For team-based, compliant, enterprise investigation work, Summit is actually lower TCO when you factor in collaboration, audit, and management overhead." |

### Competitive Positioning Statement

> "Maltego is excellent for OSINT reconnaissance. Summit is a full analyst workbench for investigations that require collaboration, provenance, and compliance. If you need more than recon—if you need to manage cases, work as a team, and produce auditable products—Summit is the complete solution."

---

## Battlecard #5: Neo4j + Custom UI

### Overview

| Attribute | Neo4j + Custom | Summit |
|-----------|----------------|--------|
| **Foundation** | Neo4j database | Neo4j + PostgreSQL + full stack |
| **UI** | Custom built | Production-ready workbench |
| **Features** | Whatever you build | Graph + Timeline + Map + AI + Provenance |
| **Compliance** | Build yourself | Built-in |
| **Time to Value** | 6-12+ months | 8-12 weeks |

### Where Neo4j + Custom Wins

- **Flexibility** — unlimited customization
- **Neo4j expertise** — leverage existing skills
- **Control** — no platform constraints

### Where Summit Wins

| Dimension | Summit Advantage | Proof Points |
|-----------|-----------------|--------------|
| **Complete solution** | Not just database; full analyst UX | Demo |
| **Provenance layer** | Not in Neo4j; built into Summit | Architecture |
| **Policy layer** | ABAC/OPA not in Neo4j | Policy demo |
| **Time to value** | Weeks, not months | Pilot timeline |
| **Maintained** | We handle updates; you focus on mission | Release cadence |

### Trap Questions

1. "How are you handling provenance at the property level in Neo4j?"
2. "What's your ABAC/policy enforcement strategy?"
3. "Who's building and maintaining the analyst UI?"
4. "How are you handling compliance documentation (SBOM, audit logs)?"

### Objection Handling

| Objection | Response |
|-----------|----------|
| "We already have Neo4j skills" | "Perfect—Summit runs on Neo4j. Your team's Cypher skills are directly applicable. Summit adds the analyst UX, provenance, and policy layers your team won't have to build." |
| "We want raw database control" | "You still have it. Summit exposes Neo4j for advanced queries. But analysts shouldn't need to write Cypher—Summit gives them NL queries while power users can still go direct." |

### Competitive Positioning Statement

> "Neo4j is a great graph database, but it's just the database. You still need to build the analyst UI, provenance layer, policy enforcement, and compliance documentation. Summit gives you all of that on top of Neo4j, ready to use in weeks instead of months."

---

## Battlecard #6: Elastic/Splunk (Search-First Tools)

### Overview

| Attribute | Elastic/Splunk | Summit |
|-----------|----------------|--------|
| **Core Model** | Document/log search | Graph relationships |
| **Primary Use** | SIEM, log analytics | Investigation, analysis |
| **Relationship Handling** | Limited (joins, lookups) | Native graph |
| **AI/ML** | ML modules, anomaly detection | Policy-gated AI, NL queries |
| **Provenance** | Log retention | Chain-of-custody |

### Where Elastic/Splunk Win

- **Log/SIEM dominance** — standard for security ops
- **Scale** — massive data volumes
- **Ecosystem** — integrations, apps, community
- **Alerting** — real-time detection and alerting

### Where Summit Wins

| Dimension | Summit Advantage | Proof Points |
|-----------|-----------------|--------------|
| **Relationship-first** | Graph native; not retrofitted | Data model |
| **Investigation workflow** | Built for analysts, not ops | UI demo |
| **Provenance** | Chain-of-custody, not just logs | Export demo |
| **Policy-gated AI** | Classification-aware | Policy demo |

### Trap Questions

1. "How do your analysts trace relationships across entities—not just search logs?"
2. "When you need to show how an analytic conclusion was reached, how is that documented?"
3. "How do you handle multi-hop relationship queries across your data?"

### Objection Handling

| Objection | Response |
|-----------|----------|
| "We already have Elastic/Splunk" | "Those are great for log search and SIEM. Summit is for the next step—when analysts need to investigate relationships, build cases, and produce auditable products. We integrate with your existing stack." |
| "We can do graphs in Elastic" | "You can visualize some relationships, yes. But true graph queries—multi-hop traversals, relationship-centric analysis—require a graph-native platform. That's what Summit provides." |

### Competitive Positioning Statement

> "Elastic and Splunk are excellent for log search and security operations. Summit is for the investigation layer—when you need to trace relationships, build cases, and produce auditable analytic products. They're complementary: Elastic/Splunk for detection, Summit for investigation."

---

## General Competitive Principles

### Do's

- **Lead with Summit strengths** — provenance, policy-gated AI, time-to-value
- **Ask questions** — let the prospect discover competitor gaps
- **Acknowledge competitor strengths** — builds credibility
- **Focus on fit** — "right tool for the job" positioning
- **Use proof points** — demos, references, documentation

### Don'ts

- **Don't attack competitors** — it looks desperate
- **Don't claim features you don't have** — it backfires
- **Don't oversimplify** — competitors have real strengths
- **Don't ignore incumbency** — understand switching costs

### Universal Differentiators (Use Against Any Competitor)

1. **Provenance-first architecture** — chain-of-custody at the data element level
2. **Policy-gated AI** — ABAC/OPA enforcement on AI outputs
3. **Time to value** — 8-12 week pilots, not 12-24 month deployments
4. **Total cost** — predictable, right-sized pricing
5. **Open architecture** — GraphQL, REST, STIX/TAXII; no lock-in

---

_Version: 2025-11-27 | Confidential — Internal Use Only_
