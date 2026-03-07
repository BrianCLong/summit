# The Summit Category Creation Strategy

A playbook for positioning BrianCLong/summit so it creates a new market category instead of competing inside the crowded RAG ecosystem.

This strategy integrates the architecture designed earlier (GraphRAG → Investigation Engine → Autonomous Research Lab → Cognitive Enterprise) and frames it as a new market layer.

## 1.0 ITEM

**Objective**

Position Summit not as another RAG framework but as:
**AI Investigation Infrastructure**

The category narrative:

* Databases → store data
* Search engines → retrieve data
* AI assistants → summarize data
* **Summit → investigate reality**

This is a different product category, not a feature.

## 1.1 Ground Truth Capture

**ITEM:CLAIM-01**
RAG systems retrieve documents and generate summaries.

**ITEM:CLAIM-02**
Organizations require structured investigations, not just answers.

**ITEM:CLAIM-03**
Knowledge graphs enable reasoning across relationships.

**ITEM:CLAIM-04**
Strategic decision-making requires evidence-backed analysis.

**ITEM:CLAIM-05**
Platforms that define interfaces and ecosystems tend to dominate categories.

## 1.2 Claim Registry

| Capability | Claim |
|---|---|
| GraphRAG reasoning | CLAIM-03 |
| Investigation graphs | CLAIM-02 |
| Evidence verification | CLAIM-04 |
| Research agents | CLAIM-02 |
| Open ecosystem | CLAIM-05 |
| Counterfactual simulation | Summit original |

## 1.3 Repo Reality Check

Current architectural primitives already support category creation.

Verified modules:

```text
src/
  agents/
  connectors/
  graphrag/
  api/
```

Future category-defining modules (ASSUMPTION):

```text
src/investigation/
src/research/
src/lab/
src/cognitive/
src/plugins/
```

Validation output:
`docs/architecture/repo_assumptions.md`

## 1.4 Minimal Winning Slice

The first category-defining capability:
**Executable Investigation Graphs**

Instead of: ask question → get answer
Summit provides: ask question → generate investigation → execute evidence graph

Artifacts:

* `investigation-graph.json`
* `report.json`
* `trace.json`

These artifacts define the Summit ecosystem standards.

## 1.5 The New Category

**Category name:**
**AI Investigation Infrastructure**

**Definition:**
Software that automatically constructs and executes evidence-based investigations across data sources.

This category is distinct from:

| Category | Focus |
|---|---|
| RAG | document retrieval |
| analytics | dashboards |
| knowledge graphs | data structure |
| AI assistants | chat |

Summit sits above them.

## 1.6 The Category Pyramid

Summit’s architecture naturally defines a layered stack.

```text
Enterprise Data
        │
        ▼
Knowledge Graph (GraphRAG)
        │
        ▼
Investigation Engine
        │
        ▼
Autonomous Research Lab
        │
        ▼
Cognitive Enterprise
```

Each layer expands the category.

## 1.7 Category Narrative

The narrative must change the conversation.

Old framing:
RAG improves search.

New framing:
AI should investigate problems, not just answer questions.

Example messaging:
Chatbots answer questions. Summit conducts investigations.

## 1.8 The Category Wedge

Every category starts with a wedge use case.

Best initial wedge:
**AI Research Analyst**

Example tasks:

* market research
* financial analysis
* competitive intelligence
* incident investigation

This use case is valuable enough to drive adoption.

## 1.9 Ecosystem Strategy

To become platform infrastructure, Summit must enable extensions.

Plugin architecture:
`src/plugins/`

Plugin types:

* investigation agents
* industry analysis modules
* simulation engines
* data connectors
* visualization tools

Example ecosystem:

```text
plugins/
  biotech-research
  supply-chain-analysis
  fintech-risk-model
```

This creates a marketplace flywheel.

## 1.10 Open Standards

Categories require standards.
Summit should define three canonical formats:

1. Investigation Graph: `investigation-graph.json`
2. Evidence Graph: `evidence-graph.json`
3. Research Report: `report.json`

These become the interoperability layer for the ecosystem.

## 1.11 Competitive Positioning

Current market:

| System | Category |
|---|---|
| LangChain | RAG tooling |
| Perplexity | research assistant |
| Palantir | enterprise analytics |
| OpenAI Deep Research | automated research |

Summit should position itself as the Infrastructure layer beneath these systems.
Example framing:
LangChain is for chat apps.
Summit is for investigations.

## 1.12 The Platform Flywheel

A successful category needs a self-reinforcing ecosystem.

Summit flywheel:

```text
More connectors
      ↓
More knowledge graphs
      ↓
Better investigations
      ↓
More plugins
      ↓
More developers
      ↓
More adoption
```

This creates defensibility.

## 1.13 The Linux Analogy

Linux succeeded because it defined the kernel of computing infrastructure.

Summit equivalent:

| Linux | Summit |
|---|---|
| kernel | GraphRAG |
| drivers | connectors |
| system utilities | investigation agents |
| packages | plugins |

This positions Summit as the reasoning kernel for enterprise AI.

## 1.14 Category Risks

Potential pitfalls:

1. **Being perceived as RAG**
If messaging focuses on retrieval, the category collapses.

2. **Over-complex architecture**
Developers must be able to build plugins easily.

3. **Lack of ecosystem**
Without plugins, the platform stalls.

Mitigation:

* simple APIs
* plugin templates
* clear documentation

## 1.15 Strategic Conclusion

Summit’s unique strength is the convergence of:
knowledge graphs + investigation agents + autonomous research loops + counterfactual simulation

Together they define a new category: **AI Investigation Infrastructure**

If executed well, Summit becomes the platform for AI research analysts, auditors, investigators, strategists, and enterprise intelligence systems. Which is exactly how categories like databases, operating systems, and cloud platforms emerged.

**Final Founder Insight**
The goal is not to build a better RAG system.
The goal is to make people say:
RAG answers questions. Summit investigates reality.

When that shift happens, Summit stops competing with tools and starts defining an entirely new layer of AI infrastructure.
