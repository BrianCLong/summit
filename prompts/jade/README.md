# JADE Framework Playbooks & Artifacts

This library contains "snap-in playbooks" for the JADE framework, designed to provide structure and consistency to missions.

## Thesis
*   **You’ve got:** identity, input contract, output contract.
*   **What’s next:** a library of “snap-in playbooks” for each MODE + core artifacts so you don’t reinvent structure every mission.
*   **Concept:** Micro-templates you can paste after a mission: “Run JADE Scenario Playbook on this.”

## Mode Playbooks

### 1.1 [JADE] Strategic Foresight – Scenario Playbook

**ID:** `jade.scenario@v1`

Using the mission and context, generate:

1) DRIVERS & UNCERTAINTIES
- 5–10 key drivers (tech, market, regulation, behavior).
- 3–5 critical uncertainties.

2) SCENARIO GRID
- Define 2 key axes that produce 4 quadrants of futures.
- Name the quadrants with short, evocative labels.

3) THREE SCENARIOS
- P50 (most likely baseline):
  - Headline:
  - 12–24 month narrative:
  - Key risks & opportunities:
- P10 (optimistic upside tail):
  - Headline:
  - Narrative:
  - Upside and enabling conditions:
- P10 (downside tail):
  - Headline:
  - Narrative:
  - Failure modes and triggers:

4) OPTIONS & MOVES
- For each scenario, list:
  - No-regret moves
  - Differentiated bets
  - Hedges

5) SIGNPOSTS & EARLY WARNINGS
- 5–10 observable signposts and how they push probability mass
  - For each: what to track, where, how often.

Respect PCS: assumptions, confidence, falsifiers, residual unknowns.

---

### 1.2 [JINX] Adversary Emulation – Campaign Playbook

**ID:** `jinx.campaign@v1`

Using the mission and adversary model, generate:

1) ADVERSARY OBJECTIVES & CONSTRAINTS
- Their primary goals.
- Their constraints (legal, technical, political, resource).

2) TTP CHAINS / CAMPAIGN PHASES
- 3–5 plausible campaigns.
- For each campaign:
  - Phase 0: Recon & shaping.
  - Phase 1: Initial access / influence / positioning.
  - Phase 2: Exploitation / escalation.
  - Phase 3: Consolidation / cover.

3) CAMPAIGN TREE
- Show branching:
  - If defender does X, adversary likely does Y/Z.
  - Include “cheap switches”: low-cost pivots for the adversary.

4) DEFENSIVE MAPPING
- For each phase:
  - Existing controls / capabilities.
  - Gaps and likely failure points.
  - High-leverage defensive investments (systemic, not one-off).

5) METRICS & TRIPWIRES
- Detectable signals that a campaign path is being executed.
- Leading indicators vs. lagging indicators.

Ensure explicit assumptions, confidence, and falsifiers.

---

### 1.3 [JURY] Policy, Legal & Standards – Compliance/Coalition Playbook

**ID:** `jury.policy@v1`

Given the mission and jurisdictions:

1) REGIME MAP
- Identify key laws, standards, and regulators affected.
- Map to mission surface (where we are exposed).

2) OBLIGATIONS & OPPORTUNITIES
- Minimal compliance obligations (must-do).
- Strategic opportunities (shape or exceed standards for moat).

3) POLICY STRATEGY
- 3–5 strategic positions (stances) we can take.
- Risks/benefits of each stance.

4) COALITION MAP
- Stakeholder categories (regulators, industry, NGOs, etc.).
- Potential allies, opponents, and swing actors.
- Incentives and levers for each.

5) COMMENT / BRIEF OUTLINE
- Skeleton for a policy comment or briefing memo:
  - Executive summary
  - Position
  - Evidence & arguments
  - Requests / proposed language

Include PCS: sources, assumptions, confidence, falsifiers.

---

### 1.4 [JAVELIN] Competitive / GTM – Moat & Category Playbook

**ID:** `javelin.moat@v1`

Using the mission and market context:

1) COMPETITIVE LANDSCAPE
- 3–7 key competitors / archetypes.
- Their primary moats and vulnerabilities.

2) CATEGORY STORY
- Current “default narrative” of the category.
- Potential new category framing favorable to us.

3) MOAT DESIGN
- Data/standards moats
- Network effects and ecosystem plays
- Switching costs and compliance capital

4) GTM MOVES
- 3–5 strategic GTM plays:
  - ICPs, channels, pricing levers, partnerships.

5) RISKS & COUNTER-MOVES
- Likely competitive reactions.
- How to pre-empt or absorb them.

PCS as usual.

---

### 1.5 [JIGSAW] Narrative Defense – Info Ops Playbook

**ID:** `jigsaw.defense@v1`

Given the mission and narrative environment:

1) CLAIM-EVIDENCE-WARRANT TABLE
- Key claims we need to support.
- Evidence we have / need.
- Warrants (why the evidence supports the claim).

2) THREAT NARRATIVES
- 3–7 hostile or harmful narratives.
- Their emotional drivers and audiences.

3) MESSAGE ARCHITECTURE
- Core narrative (1–2 sentences).
- 3–5 supporting messages.
- Do & don’t say list.

4) CHANNEL STRATEGY
- Priority channels and formats.
- What to pre-bunk vs. debunk.

5) CRISIS COMMS CHECKLIST
- Triggers to activate crisis mode.
- Basic “hold” statement template.
- Escalation tree (who needs to be looped in).

With PCS & falsifiers.

---

### 1.6 [JANUS] Double-Loop Learning – Post-Action Playbook

**ID:** `janus.action@v1`

For a completed or ongoing initiative:

1) OBJECTIVES VS OUTCOMES
- What we intended (OKRs).
- What actually happened.

2) SINGLE-LOOP LEARNING
- What we adjust in execution (tactics, process).

3) DOUBLE-LOOP LEARNING
- What we update in:
  - Assumptions
  - Mental models
  - Strategy and doctrine

4) METRIC REFRESH
- Which metrics failed us.
- New/adjusted metrics and thresholds.

5) DOCTRINE UPDATE
- Concrete changes to “how we do things.”
- Version/tag for the updated doctrine.

PCS included.

## Artifact Templates

You can also call artifacts directly, e.g.: “Using the analysis above, output a SCENARIO_SET artifact.”

### 2.1 Scenario Set

**ID:** `jade.scenario-set@v1`

**ARTIFACT: SCENARIO_SET**

1) AXES & RATIONALE
2) SCENARIO TABLE
- Name | Type (P50/P10+/P10-) | Summary | Key Drivers | Risks | Opportunities

3) OPTIONS BY SCENARIO
- No-regret moves
- Bets
- Hedges

4) SIGNPOST TABLE
- Signpost | What it suggests | Where to monitor | Cadence

---

### 2.2 Campaign Tree

**ID:** `jade.campaign-tree@v1`

**ARTIFACT: CAMPAIGN_TREE**

1) OBJECTIVE
2) ROOT NODE (Initial condition)
3) BRANCHES
- Step | Adversary action | Our detection | Our response | Alternate branches

4) GAPS
- Missing controls
- Missing telemetry
- Missing playbooks

5) PRIORITIES
- Top 3 fixes by leverage.

---

### 2.3 Game Matrix

**ID:** `jade.game-matrix@v1`

**ARTIFACT: GAME_MATRIX**

1) PLAYERS & OBJECTIVES
2) STRATEGY SETS (our options, their options)
3) PAYOFF MATRIX (qualitative is fine)
4) DOMINATED / DOMINANT STRATEGIES
5) RECOMMENDED MIXED OR ROBUST STRATEGY

---

### 2.4 Narrative Defense Kit

**ID:** `jade.narrative-kit@v1`

**ARTIFACT: NARRATIVE_KIT**

1) CORE NARRATIVE
2) SUPPORTING MESSAGES
3) CLAIM-EVIDENCE TABLE
4) HOSTILE NARRATIVES & RESPONSES
5) CHANNEL & TIMING PLAN
6) CRISIS SNIPPETS (short, ready-to-use)

---

### 2.5 Roadmap & 30/60/90

**ID:** `jade.roadmap@v1`

**ARTIFACT: ROADMAP_30_60_90**

1) OUTCOME NORTH STAR
2) 30-DAY FOCUS
- Objectives
- Key workstreams
- Owners

3) 60-DAY FOCUS
4) 90-DAY FOCUS
5) RISKS & DEPENDENCIES
6) CHECKPOINT METRICS (per phase)
