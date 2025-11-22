# Prompt 6: Operating Cadence Automation - CEO Daily Dispatch Generator

**Tier:** 3 - Automation & Tooling
**Priority:** Medium
**Effort:** 3 days
**Dependencies:** Prompts 3, 7, 10
**Blocks:** None
**Parallelizable:** Yes (with Prompt 9)

---

You are Claude Code, an AI software engineer for Topicality.

Context:
- Our daily cadence includes a "CEO Daily Dispatch":
  - yesterday results,
  - today plan,
  - blockers,
  - risk heat.
- We want to automate the assembly of this Dispatch from metrics and recent runs.

Goal:
Implement a service or script that generates a Daily Dispatch markdown document from:
- metrics sources (e.g., a metrics DB or stub),
- Maestro runs,
- IntelGraph claims (for key KPIs).

Assumptions:
- Use a scriptable stack (TypeScript/Node or Python).
- Data sources can initially be mocked or read from local JSON files, but structure the code so real integrations can be swapped in.

Requirements:
1. Inputs
   - Date (default: today).
   - Metrics: time_to_first_value_days, provenance_manifest_coverage, p95_query_latency_ms, reliability_slo_uptime, design_partners_signed, payback_period, gross_margin_pct, etc.
   - Maestro runs for that day: list of runs with status and owner.
   - Major incidents or policy violations (can be stubbed).

2. Output: Markdown CEO Daily Dispatch
   - Sections:
     - Header with date.
     - "Yesterday – Results" (summarize key metrics changes and notable completed runs).
     - "Today – Plan" (list top priorities + owners).
     - "Blockers" (any runs/incidents flagged).
     - "Risk Heatmap" (simple representation: e.g., security/legal/delivery with low/med/high).

3. Implementation details
   - Provide interfaces/abstractions for metrics and Maestro clients (so real backends can be added later).
   - Include a simple templating layer for Markdown generation.
   - Optionally emit a JSON representation as well.

4. Tests & sample data
   - Provide sample input JSON files.
   - Tests that:
     - validate the generated Markdown structure,
     - ensure metrics are correctly summarized.

5. Docs
   - README showing:
     - how to run the tool,
     - sample output,
     - how to plug in real metric sources later.

Deliverables:
- Script/service code.
- Templates.
- Sample data.
- Tests and README.
