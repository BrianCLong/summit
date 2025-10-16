export interface ProviderRoute {
  tags: string[];
  primary: string;
  fallbacks: string[];
  notes?: string;
}

export interface LinearXQualityGates {
  latencyP95Ms: number;
  bootstrapCostCapUsd: number;
  escalateConfidenceThreshold: number;
}

export interface ToolContract {
  name: string;
  request: string;
  response: string;
  mutation: boolean;
}

export interface LinearXQuickNextStep {
  id: number;
  description: string;
}

export interface LinearXShortQuestionAnswer {
  question: string;
  answer: string;
}

export interface LinearXKeyboardShortcut {
  action: string;
  defaultShortcut: string;
  alternatives?: string[];
  description: string;
  category?: string;
  commandPaletteIntentId?: string;
}

export interface LinearXCommandPaletteIntent {
  id: string;
  title: string;
  utterances: string[];
  preview: string;
  confirmationRequired: boolean;
  relatedShortcuts?: string[];
}

export interface LinearXCommandPaletteCategory {
  id: string;
  title: string;
  description?: string;
  intentIds: string[];
}

export interface LinearXCommandPaletteManifest {
  intents: LinearXCommandPaletteIntent[];
  categories: LinearXCommandPaletteCategory[];
  shortcutsByIntent: Record<string, string[]>;
}

export interface LinearXBoardEnhancement {
  feature: string;
  description: string;
  defaultState: 'enabled' | 'disabled' | 'preview';
  telemetryKey: string;
}

export type LinearXKeyboardShortcutMap = Record<
  string,
  LinearXKeyboardShortcut[]
>;

export interface LinearXGraphQLBinding {
  operation: 'Query' | 'Mutation';
  field: string;
  inputType: string;
  returnType: string;
  tool: string;
  description: string;
  policyAction: string;
  requiresCostGuard?: boolean;
  registersEvidence: boolean;
  guardrails: string[];
  commandPaletteIntentId?: string;
  keyboardShortcutAction?: string;
  evidenceShape?: string;
}

export interface LinearXGuardedInvocationStep {
  order: number;
  title: string;
  description: string;
}

export interface LinearXGuardedInvocationPlan {
  tool: string;
  policyAction: string;
  steps: LinearXGuardedInvocationStep[];
  notes?: string[];
}

export interface LinearXGuardedInvocationOptions {
  requiresCostGuard?: boolean;
  evidenceShape?: string;
  registersEvidence?: boolean;
  notes?: string[];
}

export interface LinearXOrchestratorSpec {
  systemPrompt: string;
  providerRouting: ProviderRoute[];
  fallbackChain: string[];
  qualityGates: LinearXQualityGates;
  toolContracts: ToolContract[];
  quickNextSteps: LinearXQuickNextStep[];
  shortAnswers: LinearXShortQuestionAnswer[];
  keyboardShortcuts: LinearXKeyboardShortcut[];
  commandPaletteIntents: LinearXCommandPaletteIntent[];
  commandPaletteCategories: LinearXCommandPaletteCategory[];
  boardEnhancements: LinearXBoardEnhancement[];
  graphqlBindings: LinearXGraphQLBinding[];
}

export interface ProviderResolutionOptions {
  confidence?: number;
  overContextLimit?: boolean;
  fallbackDepth?: number;
}

export const LINEARX_SYSTEM_PROMPT = `MASTER SYSTEM PROMPT — “LinearX for IntelGraph”

You are “LinearX Orchestrator,” a product+engineering co-pilot tasked with replicating and surpassing Linear’s UX, speed, and workflows—while integrating deeply with IntelGraph (graph-native entities, provenance, policy, RAG) and the Build Platform (codegen, scaffolding, CI/CD).
Your priorities: Groq-first latency & cost, flawless developer ergonomics, audit-ready provenance, and enterprise guardrails.

0) Mission & Non-Negotiables

Mission: Provide a Linear-class issue/project platform—snappy UI, command palette, keyboard-first, real-time sync, offline-friendly—plus graph analytics (GraphRAG, entity resolution), predictive insights (ETA, risk, dependency heat), and automated triage across repos, PRs, incidents, and roadmap.

Guardrails: RBAC/JWT, tenant isolation, immutable audit, privacy by default, OWASP, least privilege, SOC2-ready logging. Always call policy.check before cross-tenant/export actions.

Provenance: Every state mutation registers evidence: who/when/why/tool, hashes, and source doc/PR/commit refs. Always return citations[], assumptions[], limitations[], and confidence.

1) Provider Routing (Free-first)

Primary: Groq for fast reasoning/codegen/summarization.

Fallbacks: OpenRouter → OpenAI → Anthropic only if confidence < 0.6 or capability/length limits. Respect budgets: latency.p95_ms<=1200 (interactive), hard_cost_usd=0 during bootstrap. Produce partials if caps hit.

Model tags:

fast.code, fast.plan, fast.summarize, cheap.translate → Groq

reason.long, reason.safety, reason.dense → escalate in order

rag.graph, rag.docs, vision.ocr, audio.stt → cheapest competent first

Return used_model_tag, provider.

2) Core Outcomes to Replicate (and Exceed)

Issues: create/edit, statuses, labels, priorities, estimates, SLA clocks, subscribers, custom fields, templates, forms, recurring tasks.

Projects/Roadmaps: multi-team timelines, goals/KPIs, milestones, dependencies, risk scoring, scenario planning, portfolio views.

Cycles/Sprints: WIP limits, burn-down/up, auto-rollover, capacity planning, forecasted spillover with confidence bands.

Views & UX: kanban, list, board swimlanes, split views, fast filters (q:), powerful command palette, keyboard shortcuts parity/superior.

Integrations: GitHub/GitLab/Bitbucket, Slack/Teams, PagerDuty/Opsgenie, Calendar, Figma, Notion/Confluence, SSO/SCIM, Webhooks.

Automation: triage rules, label/assignee/routing, dedupe, SLA escalations, PR linkback, “close on merge”, branch naming, release notes.

Insights: lead/cycle time, DORA, PR review latency, dependency graph, critical path, anomaly detection, ETA prediction, incident postmortems.

AI Upgrades: NL→issue/project, backlog grooming, duplicate detection, GraphRAG for requirement context, PR summarization, spec-to-tests, risk explanations + counterfactuals.

3) IntelGraph Binding (Graph-First)

Map Linear-like objects onto graph nodes/edges for global analytics:

Nodes: Issue, Project, Cycle, Milestone, Commit, PR, Repo, Service, Incident, User, Team, Label, Attachment, Doc

Edges (examples):
(:Issue)-[:BLOCKS|:BLOCKED_BY]->(:Issue)
(:Issue)-[:IN_CYCLE]->(:Cycle)
(:Issue)-[:IN_PROJECT]->(:Project)
(:Issue)-[:LINKED_TO]->(:PR|:Commit|:Doc)
(:Incident)-[:AFFECTS]->(:Service)
(:User)-[:MEMBER_OF]->(:Team)

Time/versioning: All nodes/edges have validFrom/validTo, updatedBy, evidenceId.

4) Tool/Function Contracts (call deterministically)

The orchestrator chooses tools; NEVER invent fields. Return minimal tokens.

policy.check(action: string, context: object) → {allow, reason}

prov.register(evidence: object) → {evidenceId, hash}

graph.query(cypher: string, params?: object) → {rows, paths, stats, citations[]}

graph.explain(paths: string[]) → {rationales[], saliency[], counterfactuals[]}

linearx.issue.create(input) → {issueId, url}

linearx.issue.update(selector, patch) → {issueId, changes}

linearx.issue.search(query, opts) → {items[], facets}

linearx.issue.linkPR(issueId, {provider, repo, pr}) → {ok}

linearx.project.create(input) / linearx.project.update(...)

linearx.cycle.create({teamId, start,end, capacity})

linearx.view.save({name, filters, layout})

linearx.automation.upsert(rule) → triage/SLA/escalations

scm.getPR({provider, repo, number}) → {title, body, commits[], files[], state}

chat.notify({channel, message, mentions[]})

search.graphRAG(query, scope) → {answers[], paths[], citations[]}

cost.guard(plan) → {ok, revisedPlan, hints[]}

Rules:

For any export/invite/webhook: policy.check first.

Every create/update → prov.register with inputs & tool outputs.

Use cost.guard for long jobs; chunk with map-reduce if needed.

5) Output Contract

Return JSON:

{
  "result": "...user-facing summary or artifact...",
  "entities": { "created":[], "updated":[] },
  "citations": ["graph:...","pr:...","doc:..."],
  "provenance": {"methods":[], "assumptions":[], "limitations":[], "license":"internal"},
  "confidence": 0.0,
  "used_model_tag": "fast.plan",
  "provider": "groq"
}

6) Quality Gates

Speed: Prefer actions that keep p95 ≤ 1200ms (interactive). Defer heavy analytics with an explicit plan + partials.

Truthfulness: For claims needing evidence, ensure citations.length>0; otherwise lower confidence≤0.4 and suggest a tool call.

Safety: If policy.check denies, explain plainly and propose safe alternatives.

DX/UX: For every mutation, propose keyboard shortcut & command-palette alias; ensure undo/redo notes.

7) Canonical Behaviors (Few-Shot)

A) NL → Issue (with PR context)

Parse user intent → issue.create draft with template, labels, priority, team.

Pull recent PRs touching same files; suggest duplicates/links; set BLOCKED_BY edges if PR pending.

Output short summary + keyboard shortcut suggestion (e.g., I N for new issue).

B) Backlog Grooming

Cluster by topic & owner; detect duplicates via GraphRAG; propose merges.

Compute ETA bands using historical cycle time; flag risked dependencies; auto-assign reviewers.

Return table with confidence, risk_reason, citations.

C) Sprint Planning

Capacity check per team; enforce WIP; compute spillover risk; propose slice plan.

Create Cycle, move issues, create edges, notify channel; include reversible mutation plan.

D) Incident to Issues

From PagerDuty incident: generate chronology, extract tasks, create linked issues with SLAs; map services affected; open postmortem doc.

Provide dependency path explanation via graph.explain.

8) Linear-Plus Features (Surpass)

Predictive critical path with counterfactual “shorten by N days if X unblocked.”

Risk heatmap across repos/services using code churn × ownership × review latency.

AI Command Palette: natural language actions with confirmation preview.

Spec-to-Tests: parse spec/docs → generate Jest/Playwright scaffolds; open PR.

Release Notes Composer: select time window → summarize merged PRs/issues with links.

Portfolio What-If: scenario toggle (scope/time/people) → recompute forecasts.

Cross-graph insights: join incidents, customer tickets, sales blockers to roadmap.

9) Data Model (minimum fields)

Issue: id, title, description, status, stateGroup, priority, estimate, assigneeId, teamId, labels[], projectId?, cycleId?, sla, custom{}, subscribers[], createdAt, updatedAt

Project: id, name, goal, ownerTeamId, health, start, target, metrics{}, risk

Cycle: id, teamId, start, end, capacity, wipLimit, metrics{burnDown, velocity}

PR: id, provider, repo, number, state, commits[], files[], linkedIssueIds[]

10) UX Requirements

Keyboard parity (or better) vs Linear, including palette (⌘K), create (C), move (M), assign (A), label (L), status (S), navigate (G G, G B, etc.).

Real-time optimistic updates, offline queue, conflict resolution.

SLA clock visualization on cards; dependency glyphs; risk badges.

11) Build Platform Mode (Codegen)

When asked to scaffold/build:

Emit Node/Express + Apollo GraphQL resolvers, Neo4j schema (Cypher constraints), Postgres migrations, Redis streams, Socket.IO hooks.

Frontend: React 18 + Material-UI + Cytoscape.js, with jQuery for DOM/event glue (drag, palette focus traps), Redux Toolkit for state.

Include Jest/Supertest/Playwright tests, k6 load, Docker Compose, Helm/Terraform stubs.

Enforce parameterized queries, CSRF, XSS sanitization, audit logging, OPA/ABAC hooks.

Provide branch names and commit messages.

Minimal Routing Hints (runtime decides actual models)

fast.plan/fast.summarize → Groq Llama/DeepSeek classes

reason.long → escalate to OpenRouter/OpenAI/Anthropic only if needed

rag.graph → call search.graphRAG + graph.query for paths; summarize

Example Prompt Usage (caller message → tools → response)

User: “Create a sprint for Team Core next Monday for 2 weeks, move all ‘High’ issues with open PRs into it, and DM the owners.”
Planner:

policy.check("plan.cycle.create", {...})

linearx.cycle.create({teamId:"core", start:"2025-09-29", end:"2025-10-13"})

graph.query to find issues status∈{Todo,In Progress} AND priority=High AND LINKED_TO:PR state=open

linearx.issue.update to set cycleId

chat.notify summaries per owner

prov.register for all artifacts
Return: concise summary, counts, links, citations, confidence.

END OF MASTER PROMPT`;

export const LINEARX_PROVIDER_ROUTING: ProviderRoute[] = [
  {
    tags: ['fast.code', 'fast.plan', 'fast.summarize', 'cheap.translate'],
    primary: 'groq',
    fallbacks: ['openrouter', 'openai', 'anthropic'],
    notes:
      'Latency-sensitive and low-cost interactive tags stay on Groq whenever confidence >= 0.6 and context fits.',
  },
  {
    tags: ['reason.long', 'reason.safety', 'reason.dense'],
    primary: 'openrouter',
    fallbacks: ['openai', 'anthropic'],
    notes:
      'Use richer context providers when long-form or policy-sensitive reasoning is required.',
  },
  {
    tags: ['rag.graph', 'rag.docs', 'vision.ocr', 'audio.stt'],
    primary: 'groq',
    fallbacks: ['openrouter', 'openai', 'anthropic'],
    notes:
      'Start on Groq but fall back to the cheapest competent provider if model coverage requires it.',
  },
];

export const LINEARX_TOOL_CONTRACTS: ToolContract[] = [
  {
    name: 'policy.check',
    request: '{ action: string, context: object }',
    response: '{ allow: boolean, reason: string }',
    mutation: false,
  },
  {
    name: 'prov.register',
    request: '{ evidence: object }',
    response: '{ evidenceId: string, hash: string }',
    mutation: true,
  },
  {
    name: 'graph.query',
    request: '{ cypher: string, params?: object }',
    response: '{ rows, paths, stats, citations[] }',
    mutation: false,
  },
  {
    name: 'graph.explain',
    request: '{ paths: string[] }',
    response: '{ rationales[], saliency[], counterfactuals[] }',
    mutation: false,
  },
  {
    name: 'linearx.issue.create',
    request: '{ input }',
    response: '{ issueId: string, url: string }',
    mutation: true,
  },
  {
    name: 'linearx.issue.update',
    request: '{ selector, patch }',
    response: '{ issueId: string, changes: object }',
    mutation: true,
  },
  {
    name: 'linearx.issue.search',
    request: '{ query, opts }',
    response: '{ items: unknown[], facets: unknown }',
    mutation: false,
  },
  {
    name: 'linearx.issue.linkPR',
    request: '{ issueId, { provider, repo, pr } }',
    response: '{ ok: boolean }',
    mutation: true,
  },
  {
    name: 'linearx.project.create',
    request: '{ input }',
    response: '{ projectId: string }',
    mutation: true,
  },
  {
    name: 'linearx.project.update',
    request: '{ selector, patch }',
    response: '{ projectId: string, changes: object }',
    mutation: true,
  },
  {
    name: 'linearx.cycle.create',
    request: '{ teamId, start, end, capacity }',
    response: '{ cycleId: string }',
    mutation: true,
  },
  {
    name: 'linearx.view.save',
    request: '{ name, filters, layout }',
    response: '{ viewId: string }',
    mutation: true,
  },
  {
    name: 'linearx.automation.upsert',
    request: '{ rule }',
    response: '{ ruleId: string }',
    mutation: true,
  },
  {
    name: 'linearx.portfolio.forecast',
    request: '{ scope: PortfolioForecastInput }',
    response: '{ forecast: unknown, scenarios: unknown[] }',
    mutation: false,
  },
  {
    name: 'linearx.tests.generate',
    request: '{ specId?: string, sourceRefs: string[], targets: string[] }',
    response: '{ branch: string, files: string[], instructions: string[] }',
    mutation: true,
  },
  {
    name: 'linearx.releaseNotes.compose',
    request: '{ window: { start: string, end: string }, filters?: object }',
    response: '{ documentId: string, summary: string, sections: unknown[] }',
    mutation: true,
  },
  {
    name: 'linearx.overlay.criticalPath',
    request: '{ scope: object }',
    response:
      '{ paths: unknown[], bottlenecks: unknown[], counterfactuals: unknown[] }',
    mutation: false,
  },
  {
    name: 'scm.getPR',
    request: '{ provider, repo, number }',
    response:
      '{ title: string, body: string, commits: unknown[], files: unknown[], state: string }',
    mutation: false,
  },
  {
    name: 'chat.notify',
    request: '{ channel, message, mentions[] }',
    response: '{ ok: boolean }',
    mutation: true,
  },
  {
    name: 'search.graphRAG',
    request: '{ query, scope }',
    response: '{ answers: unknown[], paths: unknown[], citations: unknown[] }',
    mutation: false,
  },
  {
    name: 'cost.guard',
    request: '{ plan }',
    response: '{ ok: boolean, revisedPlan: unknown, hints: string[] }',
    mutation: false,
  },
];

export const LINEARX_QUICK_NEXT_STEPS: LinearXQuickNextStep[] = [
  {
    id: 1,
    description:
      'Paste this master prompt as the LinearX orchestration agent system prompt.',
  },
  {
    id: 2,
    description:
      'Wire Groq → OpenRouter → OpenAI → Anthropic routing with tag mapping.',
  },
  {
    id: 3,
    description:
      'Expose linearx.* tool endpoints in the GraphQL layer and log mutations via prov.register.',
  },
  {
    id: 4,
    description:
      'Add keyboard map and command palette intents so NL actions round-trip to the agent.',
  },
  {
    id: 5,
    description:
      'Enable dependency graph overlays and risk heatmaps on boards.',
  },
  {
    id: 6,
    description:
      'Publish the GraphQL resolver manifest + SDL from the gateway for Build Platform scaffolding.',
  },
  {
    id: 7,
    description:
      'Launch the release-notes composer and spec-to-tests intents so command palette actions round-trip end to end.',
  },
];

export const LINEARX_SHORT_ANSWERS: LinearXShortQuestionAnswer[] = [
  {
    question:
      'Which provider(s) should we allow to auto-escalate for long-context portfolio forecasts?',
    answer:
      'Escalate from Groq to OpenRouter and then OpenAI when context or confidence requires it, reserving Anthropic for extreme length or safety reviews.',
  },
  {
    question:
      'Do you want strict Linear keyboard parity or can I introduce new shortcuts (e.g., G R for risk view)?',
    answer:
      'Maintain strict parity by default but surface optional, discoverable shortcuts like G R for risk view that can be toggled per tenant.',
  },
  {
    question:
      'What’s our initial SLA policy (e.g., P1=24h, P2=72h) and escalation channels?',
    answer:
      'Adopt P0=4h, P1=24h, P2=72h, P3=120h with Slack/Teams notifications and PagerDuty escalations for P0/P1 incidents.',
  },
  {
    question:
      'Which SCM/chat stacks are in scope Day-1 (GitHub/Slack only, or include GitLab/Teams)?',
    answer:
      'Launch with GitHub and Slack first, adding GitLab and Teams once policy hooks and provenance capture are validated.',
  },
  {
    question:
      'Should we enable auto-merge on green toggles from issues via policy-checked tool calls?',
    answer:
      'Yes—behind a policy.check-gated toggle so only authorized users trigger auto-merge with full audit provenance.',
  },
];

export const LINEARX_KEYBOARD_SHORTCUTS: LinearXKeyboardShortcut[] = [
  {
    action: 'Open command palette',
    defaultShortcut: '⌘K',
    alternatives: ['Ctrl+K'],
    description:
      'Focuses the AI command palette so natural-language intents route through the orchestrator.',
    category: 'navigation',
    commandPaletteIntentId: 'command_palette',
  },
  {
    action: 'Create issue',
    defaultShortcut: 'C',
    alternatives: ['I N'],
    description:
      'Drafts a new issue with GraphRAG context, duplicate detection, and SLA recommendations.',
    category: 'workflows',
    commandPaletteIntentId: 'create_issue',
  },
  {
    action: 'Toggle dependency overlay',
    defaultShortcut: 'G D',
    alternatives: ['Shift+G Shift+D'],
    description:
      'Activates dependency graph overlays on boards, highlighting BLOCKS/BLOCKED_BY edges and critical paths.',
    category: 'insights',
    commandPaletteIntentId: 'dependency_overlay',
  },
  {
    action: 'Show risk heatmap',
    defaultShortcut: 'G R',
    alternatives: ['Shift+G Shift+R'],
    description:
      'Opens the portfolio risk heatmap overlay combining code churn, ownership, and review latency telemetry.',
    category: 'insights',
    commandPaletteIntentId: 'risk_overlay',
  },
  {
    action: 'Forecast cycle spillover',
    defaultShortcut: 'F',
    alternatives: ['Shift+F'],
    description:
      'Displays ETA bands, capacity usage, and spillover risk projections for the active cycle.',
    category: 'planning',
    commandPaletteIntentId: 'forecast_cycle',
  },
  {
    action: 'Toggle critical path overlay',
    defaultShortcut: 'G C',
    alternatives: ['Shift+G Shift+C'],
    description:
      'Highlights the predicted critical path with counterfactual guidance on how to shorten delivery.',
    category: 'insights',
    commandPaletteIntentId: 'critical_path',
  },
  {
    action: 'Compose release notes',
    defaultShortcut: 'R N',
    alternatives: ['Shift+R Shift+N'],
    description:
      'Launches the release notes composer to summarize merged issues and PRs with provenance.',
    category: 'delivery',
    commandPaletteIntentId: 'release_notes',
  },
  {
    action: 'Generate spec-to-tests scaffolds',
    defaultShortcut: 'T T',
    alternatives: ['Shift+T'],
    description:
      'Creates Jest/Playwright scaffolds from specs or docs with suggested reviewers and branches.',
    category: 'workflows',
    commandPaletteIntentId: 'spec_to_tests',
  },
  {
    action: 'Open portfolio what-if',
    defaultShortcut: 'G P',
    alternatives: ['Shift+G Shift+P'],
    description:
      'Explores what-if portfolio forecasts across teams, scope, and time scenarios.',
    category: 'planning',
    commandPaletteIntentId: 'portfolio_forecast',
  },
];

export const LINEARX_COMMAND_PALETTE_INTENTS: LinearXCommandPaletteIntent[] = [
  {
    id: 'command_palette',
    title: 'Show command palette',
    utterances: ['open palette', 'show commands', 'help'],
    preview:
      'Opens the universal command palette with contextual AI suggestions.',
    confirmationRequired: false,
    relatedShortcuts: ['⌘K', 'Ctrl+K'],
  },
  {
    id: 'create_issue',
    title: 'Draft an issue',
    utterances: ['create issue', 'log bug', 'open ticket'],
    preview:
      'Drafts a Linear-class issue, fetching GraphRAG evidence and proposing assignees and SLAs.',
    confirmationRequired: true,
    relatedShortcuts: ['C', 'I N'],
  },
  {
    id: 'dependency_overlay',
    title: 'Toggle dependency overlay',
    utterances: [
      'show dependencies',
      'toggle dependency overlay',
      'graph overlay',
    ],
    preview:
      'Enables dependency graph overlays across boards with provenance-backed tooltips.',
    confirmationRequired: false,
    relatedShortcuts: ['G D'],
  },
  {
    id: 'risk_overlay',
    title: 'Show risk heatmap',
    utterances: ['show risk heatmap', 'risk view', 'portfolio risk'],
    preview:
      'Overlays risk scores derived from ownership, churn, and incident impact analytics.',
    confirmationRequired: false,
    relatedShortcuts: ['G R'],
  },
  {
    id: 'forecast_cycle',
    title: 'Forecast cycle spillover',
    utterances: ['forecast cycle', 'predict spillover', 'cycle eta'],
    preview:
      'Computes capacity usage, confidence bands, and spillover probabilities for the active sprint.',
    confirmationRequired: true,
    relatedShortcuts: ['F', 'Shift+F'],
  },
  {
    id: 'critical_path',
    title: 'Show critical path',
    utterances: ['critical path', 'show blockers', 'how to ship faster'],
    preview:
      'Surfaces the predicted critical path with counterfactuals on how to recover lost days.',
    confirmationRequired: false,
    relatedShortcuts: ['G C'],
  },
  {
    id: 'release_notes',
    title: 'Compose release notes',
    utterances: ['release notes', 'summarize ship', 'draft changelog'],
    preview:
      'Drafts release notes with linked issues/PRs, ownership callouts, and provenance citations.',
    confirmationRequired: true,
    relatedShortcuts: ['R N'],
  },
  {
    id: 'spec_to_tests',
    title: 'Generate spec-to-tests',
    utterances: ['spec to tests', 'generate tests', 'test scaffolds'],
    preview:
      'Turns specs and docs into Jest/Playwright scaffolds with reviewer assignments and branches.',
    confirmationRequired: true,
    relatedShortcuts: ['T T', 'Shift+T'],
  },
  {
    id: 'portfolio_forecast',
    title: 'Portfolio what-if forecast',
    utterances: ['portfolio forecast', 'what if', 'scenario planning'],
    preview:
      'Runs multi-team what-if forecasts with scope/time/people toggles and ROI deltas.',
    confirmationRequired: false,
    relatedShortcuts: ['G P'],
  },
];

export const LINEARX_COMMAND_PALETTE_CATEGORIES: LinearXCommandPaletteCategory[] =
  [
    {
      id: 'navigation',
      title: 'Navigation & Awareness',
      description:
        'Quick jumps and overlays that improve situational awareness without leaving the current view.',
      intentIds: [
        'command_palette',
        'dependency_overlay',
        'risk_overlay',
        'critical_path',
      ],
    },
    {
      id: 'workflows',
      title: 'Workflow Acceleration',
      description:
        'Actions that draft or extend work items with provenance, reviewers, and automation hooks.',
      intentIds: ['create_issue', 'spec_to_tests'],
    },
    {
      id: 'planning',
      title: 'Planning & Forecasting',
      description:
        'Cycle-level and portfolio scenarios with guardrail-aware forecasts and spillover insights.',
      intentIds: ['forecast_cycle', 'portfolio_forecast'],
    },
    {
      id: 'delivery',
      title: 'Delivery Communications',
      description:
        'Narratives and updates that roll up work into exec-ready communications with citations.',
      intentIds: ['release_notes'],
    },
  ];

export const LINEARX_BOARD_ENHANCEMENTS: LinearXBoardEnhancement[] = [
  {
    feature: 'dependencyOverlay',
    description:
      'Graph-powered dependency overlay that visualizes BLOCKS/BLOCKED_BY edges with provenance tooltips.',
    defaultState: 'enabled',
    telemetryKey: 'board.dependency_overlay.enabled',
  },
  {
    feature: 'riskHeatmap',
    description:
      'Risk heatmap combining churn, ownership gaps, incidents, and SLA drift per column and swimlane.',
    defaultState: 'enabled',
    telemetryKey: 'board.risk_heatmap.enabled',
  },
  {
    feature: 'slaClocks',
    description:
      'Inline SLA countdown clocks and breach indicators synced with triage automation.',
    defaultState: 'preview',
    telemetryKey: 'board.sla_clocks.preview',
  },
  {
    feature: 'criticalPathOverlay',
    description:
      'Predictive critical path overlay with counterfactual guidance on which blockers unlock the most time.',
    defaultState: 'enabled',
    telemetryKey: 'board.critical_path.enabled',
  },
  {
    feature: 'portfolioScenarioPanel',
    description:
      'Scenario planning side panel that visualizes what-if staffing/scope changes directly from the board view.',
    defaultState: 'preview',
    telemetryKey: 'board.portfolio_scenario.preview',
  },
];

export const LINEARX_GRAPHQL_BINDINGS: LinearXGraphQLBinding[] = [
  {
    operation: 'Mutation',
    field: 'linearxIssueCreate',
    inputType: 'LinearXIssueCreateInput!',
    returnType: 'LinearXIssuePayload!',
    tool: 'linearx.issue.create',
    description:
      'Creates a new issue via the orchestrator with provenance logging and duplicate detection.',
    policyAction: 'linearx.issue.create',
    registersEvidence: true,
    guardrails: [
      'Call policy.check before invoking the tool',
      'Record prov.register with the issued payload',
      'Return citations and confidence metadata to the caller',
    ],
    commandPaletteIntentId: 'create_issue',
    keyboardShortcutAction: 'Create issue',
    evidenceShape: '{ input, toolResponse }',
  },
  {
    operation: 'Mutation',
    field: 'linearxIssueUpdate',
    inputType: 'LinearXIssueUpdateInput!',
    returnType: 'LinearXIssuePayload!',
    tool: 'linearx.issue.update',
    description:
      'Patches issue fields while enforcing RBAC, SLA clocks, and provenance capture.',
    policyAction: 'linearx.issue.update',
    registersEvidence: true,
    guardrails: [
      'Ensure policy.check approves the mutation context',
      'Merge partial updates deterministically',
      'Capture prov.register with before/after diff',
    ],
    commandPaletteIntentId: 'command_palette',
    evidenceShape: '{ selector, patch, toolResponse }',
  },
  {
    operation: 'Query',
    field: 'linearxIssueSearch',
    inputType: 'LinearXIssueSearchInput!',
    returnType: 'LinearXIssueSearchResult!',
    tool: 'linearx.issue.search',
    description:
      'Searches issues with GraphRAG augmentation and typed facets for the UI.',
    policyAction: 'linearx.issue.search',
    registersEvidence: false,
    guardrails: [
      'Respect tenant isolation filters',
      'Mask sensitive fields according to RBAC',
      'Stream partial results when exceeding latency budgets',
    ],
    commandPaletteIntentId: 'command_palette',
  },
  {
    operation: 'Mutation',
    field: 'linearxCycleCreate',
    inputType: 'LinearXCycleCreateInput!',
    returnType: 'LinearXCyclePayload!',
    tool: 'linearx.cycle.create',
    description:
      'Creates a planning cycle, distributes issues, and notifies owners with undo metadata.',
    policyAction: 'linearx.cycle.create',
    requiresCostGuard: true,
    registersEvidence: true,
    guardrails: [
      'Validate capacity assumptions with cost.guard',
      'Call policy.check before mutation',
      'Log prov.register entries for cycle creation and issue moves',
    ],
    commandPaletteIntentId: 'forecast_cycle',
    keyboardShortcutAction: 'Forecast cycle spillover',
    evidenceShape: '{ cycleInput, affectedIssues, notifications }',
  },
  {
    operation: 'Mutation',
    field: 'linearxAutomationUpsert',
    inputType: 'LinearXAutomationRuleInput!',
    returnType: 'LinearXAutomationPayload!',
    tool: 'linearx.automation.upsert',
    description:
      'Creates or updates automation rules for triage, SLA escalations, and routing.',
    policyAction: 'linearx.automation.upsert',
    requiresCostGuard: true,
    registersEvidence: true,
    guardrails: [
      'Run policy.check for automation scope',
      'Validate plan complexity with cost.guard',
      'Register prov.register with the compiled rule',
    ],
    commandPaletteIntentId: 'command_palette',
    evidenceShape: '{ rule, compiledPlan }',
  },
  {
    operation: 'Query',
    field: 'linearxPortfolioForecast',
    inputType: 'LinearXPortfolioForecastInput!',
    returnType: 'LinearXPortfolioForecastPayload!',
    tool: 'linearx.portfolio.forecast',
    description:
      'Runs what-if portfolio forecasts with staffing, scope, and timing toggles plus ROI deltas.',
    policyAction: 'linearx.portfolio.forecast',
    requiresCostGuard: true,
    registersEvidence: false,
    guardrails: [
      'Invoke cost.guard when scenario breadth exceeds interactive limits',
      'Surface assumptions and confidence bands in the response',
      'Respect tenant- and team-level visibility constraints',
    ],
    commandPaletteIntentId: 'portfolio_forecast',
    keyboardShortcutAction: 'Open portfolio what-if',
  },
  {
    operation: 'Mutation',
    field: 'linearxReleaseNotesCompose',
    inputType: 'LinearXReleaseNotesInput!',
    returnType: 'LinearXReleaseNotesPayload!',
    tool: 'linearx.releaseNotes.compose',
    description:
      'Drafts release notes with linked PRs/issues, ownership callouts, and provenance citations.',
    policyAction: 'linearx.releaseNotes.compose',
    requiresCostGuard: true,
    registersEvidence: true,
    guardrails: [
      'Call policy.check to confirm the requesting user can broadcast release communications',
      'Use cost.guard when summarizing large release windows',
      'Register prov.register with the drafted release note and source references',
    ],
    commandPaletteIntentId: 'release_notes',
    keyboardShortcutAction: 'Compose release notes',
    evidenceShape: '{ window, filters, draft }',
  },
  {
    operation: 'Mutation',
    field: 'linearxSpecToTests',
    inputType: 'LinearXSpecToTestsInput!',
    returnType: 'LinearXSpecToTestsPayload!',
    tool: 'linearx.tests.generate',
    description:
      'Generates Jest/Playwright scaffolds from specs or docs and proposes reviewers and branches.',
    policyAction: 'linearx.tests.generate',
    requiresCostGuard: true,
    registersEvidence: true,
    guardrails: [
      'Validate repository permissions via policy.check before writing branches',
      'Use cost.guard to budget codegen and diff planning',
      'Register prov.register with generated files, reviewers, and instructions',
    ],
    commandPaletteIntentId: 'spec_to_tests',
    keyboardShortcutAction: 'Generate spec-to-tests scaffolds',
    evidenceShape: '{ specRefs, generatedFiles, reviewers }',
  },
  {
    operation: 'Query',
    field: 'linearxCriticalPath',
    inputType: 'LinearXCriticalPathInput!',
    returnType: 'LinearXCriticalPathPayload!',
    tool: 'linearx.overlay.criticalPath',
    description:
      'Retrieves the predictive critical path with counterfactuals and recommended unblockers.',
    policyAction: 'linearx.overlay.criticalPath',
    registersEvidence: false,
    guardrails: [
      'Respect access controls for linked issues and dependencies',
      'Include counterfactuals with explicit assumptions',
      'Annotate each suggestion with provenance citations',
    ],
    commandPaletteIntentId: 'critical_path',
    keyboardShortcutAction: 'Toggle critical path overlay',
  },
];

export const LINEARX_SPEC: LinearXOrchestratorSpec = {
  systemPrompt: LINEARX_SYSTEM_PROMPT,
  providerRouting: LINEARX_PROVIDER_ROUTING,
  fallbackChain: ['groq', 'openrouter', 'openai', 'anthropic'],
  qualityGates: {
    latencyP95Ms: 1200,
    bootstrapCostCapUsd: 0,
    escalateConfidenceThreshold: 0.6,
  },
  toolContracts: LINEARX_TOOL_CONTRACTS,
  quickNextSteps: LINEARX_QUICK_NEXT_STEPS,
  shortAnswers: LINEARX_SHORT_ANSWERS,
  keyboardShortcuts: LINEARX_KEYBOARD_SHORTCUTS,
  commandPaletteIntents: LINEARX_COMMAND_PALETTE_INTENTS,
  commandPaletteCategories: LINEARX_COMMAND_PALETTE_CATEGORIES,
  boardEnhancements: LINEARX_BOARD_ENHANCEMENTS,
  graphqlBindings: LINEARX_GRAPHQL_BINDINGS,
};

export function resolveProviderForTag(
  tag: string,
  options: ProviderResolutionOptions = {},
  spec: LinearXOrchestratorSpec = LINEARX_SPEC,
): string {
  const route = spec.providerRouting.find((candidate) =>
    candidate.tags.includes(tag),
  );
  const chain: string[] = [];
  if (route) {
    chain.push(route.primary, ...route.fallbacks);
  }
  for (const provider of spec.fallbackChain) {
    if (!chain.includes(provider)) {
      chain.push(provider);
    }
  }
  if (chain.length === 0) {
    return spec.fallbackChain[0];
  }
  const confidence = options.confidence ?? 1;
  if (
    !options.overContextLimit &&
    confidence >= spec.qualityGates.escalateConfidenceThreshold
  ) {
    return chain[0];
  }
  const fallbackDepth = Math.max(
    1,
    Math.min(options.fallbackDepth ?? 1, chain.length - 1),
  );
  return chain[fallbackDepth];
}

export function listToolContract(
  name?: string,
): ToolContract | ToolContract[] | undefined {
  if (!name) {
    return LINEARX_TOOL_CONTRACTS;
  }
  return LINEARX_TOOL_CONTRACTS.find((contract) => contract.name === name);
}

export function summarizeQuickStart(): string[] {
  return LINEARX_QUICK_NEXT_STEPS.map(
    (step) => `${step.id}. ${step.description}`,
  );
}

export function answerShortQuestion(question: string): string | undefined {
  const match = LINEARX_SHORT_ANSWERS.find(
    (entry) => entry.question === question,
  );
  return match?.answer;
}

export function listKeyboardShortcuts(
  action?: string,
): LinearXKeyboardShortcut | LinearXKeyboardShortcut[] | undefined {
  if (!action) {
    return LINEARX_KEYBOARD_SHORTCUTS;
  }
  return LINEARX_KEYBOARD_SHORTCUTS.find(
    (shortcut) => shortcut.action === action,
  );
}

export function listCommandPaletteIntents(
  id?: string,
): LinearXCommandPaletteIntent | LinearXCommandPaletteIntent[] | undefined {
  if (!id) {
    return LINEARX_COMMAND_PALETTE_INTENTS;
  }
  return LINEARX_COMMAND_PALETTE_INTENTS.find((intent) => intent.id === id);
}

export function listCommandPaletteCategories(
  id?: string,
): LinearXCommandPaletteCategory | LinearXCommandPaletteCategory[] | undefined {
  if (!id) {
    return LINEARX_COMMAND_PALETTE_CATEGORIES;
  }
  return LINEARX_COMMAND_PALETTE_CATEGORIES.find(
    (category) => category.id === id,
  );
}

export function listBoardEnhancements(
  feature?: string,
): LinearXBoardEnhancement | LinearXBoardEnhancement[] | undefined {
  if (!feature) {
    return LINEARX_BOARD_ENHANCEMENTS;
  }
  return LINEARX_BOARD_ENHANCEMENTS.find(
    (enhancement) => enhancement.feature === feature,
  );
}

export function listGraphQLBindings(
  field?: string,
): LinearXGraphQLBinding | LinearXGraphQLBinding[] | undefined {
  if (!field) {
    return LINEARX_GRAPHQL_BINDINGS;
  }
  return LINEARX_GRAPHQL_BINDINGS.find((binding) => binding.field === field);
}

export function buildKeyboardShortcutMap(
  shortcuts: LinearXKeyboardShortcut[] = LINEARX_KEYBOARD_SHORTCUTS,
): LinearXKeyboardShortcutMap {
  return shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category ?? 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as LinearXKeyboardShortcutMap);
}

export function buildCommandPaletteManifest(
  intents: LinearXCommandPaletteIntent[] = LINEARX_COMMAND_PALETTE_INTENTS,
  shortcuts: LinearXKeyboardShortcut[] = LINEARX_KEYBOARD_SHORTCUTS,
  categories: LinearXCommandPaletteCategory[] = LINEARX_COMMAND_PALETTE_CATEGORIES,
): LinearXCommandPaletteManifest {
  const shortcutSetByIntent = new Map<string, Set<string>>();
  for (const shortcut of shortcuts) {
    const intentId = shortcut.commandPaletteIntentId;
    if (!intentId) {
      continue;
    }
    const set = shortcutSetByIntent.get(intentId) ?? new Set<string>();
    set.add(shortcut.defaultShortcut);
    for (const alternative of shortcut.alternatives ?? []) {
      set.add(alternative);
    }
    shortcutSetByIntent.set(intentId, set);
  }

  const shortcutsByIntent: Record<string, string[]> = {};
  for (const intent of intents) {
    const combined = new Set<string>(intent.relatedShortcuts ?? []);
    const set = shortcutSetByIntent.get(intent.id);
    if (set) {
      for (const value of set) {
        combined.add(value);
      }
    }
    if (combined.size > 0) {
      shortcutsByIntent[intent.id] = Array.from(combined);
    }
  }

  const normalizedCategories = categories
    .map((category) => ({
      ...category,
      intentIds: category.intentIds.filter((intentId) =>
        intents.some((intent) => intent.id === intentId),
      ),
    }))
    .filter((category) => category.intentIds.length > 0);

  return {
    intents,
    categories: normalizedCategories,
    shortcutsByIntent,
  };
}

export function generateGraphQLSchemaSDL(
  bindings: LinearXGraphQLBinding[] = LINEARX_GRAPHQL_BINDINGS,
): string {
  const grouped: Record<'Query' | 'Mutation', LinearXGraphQLBinding[]> = {
    Query: [],
    Mutation: [],
  };
  for (const binding of bindings) {
    grouped[binding.operation].push(binding);
  }
  const sections: string[] = [];
  for (const operation of ['Query', 'Mutation'] as const) {
    const entries = grouped[operation];
    if (!entries.length) {
      continue;
    }
    const body = entries
      .map(
        (entry) =>
          `  ${entry.field}(input: ${entry.inputType}) : ${entry.returnType}`,
      )
      .join('\n');
    sections.push(`extend type ${operation} {\n${body}\n}`);
  }
  return sections.join('\n\n');
}

export function planGuardedInvocation(
  tool: string,
  policyAction: string,
  options: LinearXGuardedInvocationOptions = {},
): LinearXGuardedInvocationPlan {
  const steps: LinearXGuardedInvocationStep[] = [];
  let order = 1;
  steps.push({
    order: order++,
    title: 'policy.check',
    description: `Call policy.check with action "${policyAction}" and include tenant, actor, and scope context.`,
  });
  if (options.requiresCostGuard) {
    steps.push({
      order: order++,
      title: 'cost.guard',
      description:
        'Validate plan complexity, latency budgets, and budget caps before executing the tool.',
    });
  }
  steps.push({
    order: order++,
    title: tool,
    description: `Invoke ${tool} with sanitized inputs and capture response metadata (citations, confidence).`,
  });
  const registersEvidence = options.registersEvidence ?? true;
  if (registersEvidence) {
    steps.push({
      order: order++,
      title: 'prov.register',
      description:
        'Persist evidence including inputs, tool outputs, actor, and hashes for auditability.',
    });
  }
  const notes = [...(options.notes ?? [])];
  if (options.evidenceShape) {
    notes.push(`Evidence payload shape: ${options.evidenceShape}`);
  }
  return {
    tool,
    policyAction,
    steps,
    notes: notes.length ? notes : undefined,
  };
}

export function planGuardedInvocationForBinding(
  bindingOrField: string | LinearXGraphQLBinding,
): LinearXGuardedInvocationPlan | undefined {
  const binding =
    typeof bindingOrField === 'string'
      ? LINEARX_GRAPHQL_BINDINGS.find(
          (candidate) => candidate.field === bindingOrField,
        )
      : bindingOrField;
  if (!binding) {
    return undefined;
  }
  return planGuardedInvocation(binding.tool, binding.policyAction, {
    requiresCostGuard: binding.requiresCostGuard,
    registersEvidence: binding.registersEvidence,
    evidenceShape: binding.evidenceShape,
    notes: binding.guardrails,
  });
}
