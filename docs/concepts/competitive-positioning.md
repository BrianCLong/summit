---
title: Competitive Positioning
summary: Why Summit IntelGraph is different from generic AI graph platforms
owner: docs
version: 1.0
---

# Why Summit IntelGraph is Different

Summit IntelGraph isn't just another intelligence platform. It's the **only solution** that combines provenance-first architecture, explainable AI, and policy-gated automation into a unified analyst experience.

## The View from Above the Clouds

**Our North Star:**
> _Sum it. See it. Decide._

While competitors force analysts to juggle fragmented tools and opaque AI, Summit delivers:
- **Complete visibility** across timeline, map, and graph
- **Full transparency** in AI reasoning and data lineage
- **Built-in compliance** with chain-of-custody proof

## Competitive Advantages

### 1. Only Platform with Graph-XAI Integration

**Summit:** Real-time explainable AI integrated with graph analytics from day one

**Competitors:**
- **Palantir Gotham:** Black-box AI, promises future transparency
- **IBM i2 Analyst's Notebook:** Rule-based, no AI integration
- **Maltego:** Good graph, but no AI
- **Analyst1 / ThreatConnect:** Limited AI, no graph integration

**Result:** Summit delivers **10x better explainability** than Palantir while maintaining full audit trails.

### 2. Provenance-First Architecture

**What this means:**
- Every claim is traceable to its source
- All transformations are logged with cryptographic hashes
- Export bundles are court-ready with offline verification
- Policy enforcement happens automatically based on data lineage

**No competitor offers:**
- Automatic policy derivation from source metadata
- Sub-200ms provenance lookups at scale
- Cryptographically signed export bundles
- Full offline verification capability

**Real-world impact:**
> "With Summit, we cut compliance audit time from 3 weeks to 2 days. Every piece of evidence has a complete chain of custody, automatically."
> — Director of Intelligence, Federal Law Enforcement Agency

### 3. Authority-Bound Reasoning

**Summit's unique capability:**
Analysis steps are bound to legal authorities and operational constraints:

```yaml
# Example: FISA-constrained query
Query: "Find connections to foreign entities"
Authority: Title 50, Section 1805
Constraints:
  - Must have FISA warrant
  - Minimize US Person data
  - Audit all access
  - No export without approval
  - Automatic redaction of PII
```

**No other platform:**
- Compiles legal authorities into executable constraints
- Prevents unauthorized operations at query time (not just audit after-the-fact)
- Provides human-readable justifications for denials
- Supports multi-agency data sharing with policy guarantees

### 4. Tri-Pane Intelligence View

**Summit's interface:**
```
┌─────────────────┬─────────────────┬─────────────────┐
│   Timeline      │      Map        │     Graph       │
│   (When)        │     (Where)     │     (Who/What)  │
├─────────────────┴─────────────────┴─────────────────┤
│              Copilot Assistant                      │
│  "Show me entities connected to Operation X"       │
└─────────────────────────────────────────────────────┘
```

**Why it matters:**
- **Timeline:** See temporal patterns and sequences
- **Map:** Understand geographic relationships
- **Graph:** Explore network connections
- **Copilot:** Ask questions in natural language

**Competitors** force analysts to switch between separate tools for each view, losing context and wasting time.

### 5. Deploy Anywhere

**Summit runs:**
- **Cloud:** AWS, GCP, Azure (multi-region)
- **On-Premise:** Your datacenter, your hardware
- **Air-Gap:** Fully disconnected operation
- **Edge:** Field operations with offline sync (CRDT)
- **Hybrid:** Seamless federation across environments

**Edge deployment unique features:**
- CRDT-based conflict resolution
- Automatic sync when connectivity returns
- Vector clocks for causality tracking
- Works 100% offline with full functionality

**Use case:** Military operations in denied environments still get full intelligence capabilities with automatic sync upon return.

## Feature Comparison Matrix

| Feature | Summit | Palantir | i2 Analyst's Notebook | Maltego | Analyst1 |
|---------|--------|----------|----------------------|---------|----------|
| **Graph-XAI Integration** | ✅ Real-time | ❌ Black box | ❌ None | ❌ None | 🟡 Limited |
| **Provenance Tracking** | ✅ <200ms | 🟡 Basic | ❌ None | 🟡 Manual | ❌ None |
| **Policy Enforcement** | ✅ Automatic | 🟡 Manual | ❌ None | ❌ None | 🟡 Basic |
| **Natural Language Queries** | ✅ NL→Cypher | ❌ None | ❌ None | ❌ None | 🟡 Limited |
| **Court-Ready Exports** | ✅ Signed | 🟡 Manual | 🟡 Manual | ❌ None | ❌ None |
| **Edge Deployment** | ✅ CRDT | ❌ None | ❌ None | ❌ None | ❌ None |
| **Multi-Tenant SaaS** | ✅ 4 tiers | 🟡 Enterprise | ❌ Desktop | ❌ Desktop | 🟡 Cloud |
| **Open Source Core** | ✅ Yes | ❌ No | ❌ No | 🟡 Partial | ❌ No |

Legend: ✅ Full support | 🟡 Partial/Limited | ❌ Not available

## Non-Overlapping Capabilities

**7 features competitors cannot replicate:**

### 1. Proof-Carrying Queries (PCQ)
Cryptographic attestations embedded in query results, verifiable offline without platform access.

### 2. Zero-Knowledge Deconfliction
Cross-tenant duplicate detection without revealing data contents to other tenants.

### 3. Authority-Bound Reasoning
Legal authorities compiled into executable constraints that prevent unauthorized operations.

### 4. Adversarial Narrative Lab
Pressure-test hypotheses with automated "devil's advocate" reasoning and causal metrics.

### 5. Portable Provenance Wallets
Signed evidence bundles that travel with data, verifiable in court years later.

### 6. Operator-Grade Simulations
Integrated COA planning with logistics simulation and decision logs.

### 7. Edge Autonomy Kits
Fully disconnected triage capability with automatic CRDT sync.

## Market Position

**Summit vs. Generic AI Graph Platforms:**

| Attribute | Generic Platforms | Summit IntelGraph |
|-----------|------------------|-------------------|
| **Focus** | General knowledge graphs | Intelligence-specific workflows |
| **AI Transparency** | Black box | Explainable + citations |
| **Compliance** | Add-on | Built-in, automatic |
| **Deployment** | Cloud-first | Deploy anywhere |
| **Pricing** | Per-node | Per-analyst + capabilities |
| **Target Users** | Data scientists | Intelligence analysts |
| **Time to Value** | Months (custom dev) | Minutes (golden path) |

## Customer Success Stories

### Federal Law Enforcement
**Challenge:** Manual compliance audits taking 3 weeks per case

**Solution:** Summit's automatic provenance tracking

**Result:**
- Audit time: 3 weeks → 2 days (10.5x faster)
- 100% chain of custody compliance
- Zero failed court challenges
- $2M annual savings in audit costs

### Defense Intelligence
**Challenge:** Fragmented tools, no visibility across timeline/map/graph

**Solution:** Summit's tri-pane interface + Copilot

**Result:**
- Analysis time: 6 hours → 45 minutes (8x faster)
- Pattern discovery: 2x more leads identified
- Analyst satisfaction: 47% → 89%
- Onboarding time: 2 weeks → 2 hours

### Multi-National Collaboration
**Challenge:** Share intelligence without revealing sources/methods

**Solution:** Summit's policy-gated export with redaction

**Result:**
- Secure data sharing with 12 partner nations
- Zero unauthorized disclosures
- Automatic redaction of sensitive details
- Real-time collaboration across agencies

## Pricing vs. Value

**Summit Investment:**
- **Enterprise Tier:** $500K-$2M annually (Fortune 500 / National agencies)
- **Professional Tier:** $100K-$500K annually (Mid-market / Regional agencies)
- **Starter Tier:** $50K-$100K annually (Small orgs / Local agencies)

**ROI Drivers:**
- **3-10x faster analysis** vs. manual workflows
- **10.5x faster compliance audits**
- **Zero failed court challenges** (provenance-backed evidence)
- **80% reduction** in training time (natural language interface)
- **50% fewer tools** needed (unified platform)

**Typical ROI:** Positive within 6 months for teams of 10+ analysts

## Getting Started

**Pilot Offer (6-12 weeks):**
- 2-4 data sources integrated
- Tri-pane UI with Copilot
- Policy guardrails configured
- 2-3 workflows automated
- Full training included

**Pricing:** $45K (6 weeks) / $80K (10 weeks) / $95K (12 weeks)

**50% pilot fee credited** to Year-1 contract if signed within 60 days.

## Why Choose Summit?

**Choose Summit if you need:**
- ✅ Explainable AI you can defend in court
- ✅ Automatic compliance and audit trails
- ✅ Deploy anywhere (cloud, on-prem, air-gap, edge)
- ✅ Natural language queries (no Cypher expertise required)
- ✅ 10x faster analysis vs. manual workflows

**Stick with competitors if:**
- ❌ You're okay with black-box AI
- ❌ Manual compliance processes are acceptable
- ❌ Cloud-only deployment is sufficient
- ❌ You have unlimited training budget for query languages
- ❌ Time-to-insight isn't critical

## See Also

- [Provenance & Policy](./provenance.md) — How our unique architecture works
- [AI Copilot](./copilot.md) — Natural language to Cypher with full transparency
- [Architecture](../ARCHITECTURE.md) — 152-microservice platform overview
- [Get Started](../get-started/quickstart-5-min.md) — 5-minute setup guide
