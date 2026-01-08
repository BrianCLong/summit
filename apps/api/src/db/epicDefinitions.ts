import { EpicDefinition } from "../contracts/epics.js";

export const EPIC_DEFINITIONS: EpicDefinition[] = [
  {
    id: "epic-ux-surface-reduction",
    title: "UX Surface Reduction",
    outcome: "make the product feel obvious",
    tasks: [
      {
        id: "inventory-top-50-screens",
        description: "Inventory top 50 screens/flows by usage and support burden.",
      },
      {
        id: "merge-duplicate-paths",
        description: "Merge duplicate paths into one canonical “happy path” per outcome.",
      },
      {
        id: "smart-defaults",
        description: "Remove or hide low-usage settings; replace with smart defaults.",
      },
      {
        id: "standardize-navigation",
        description: "Standardize navigation and information architecture (one mental model).",
      },
      {
        id: "component-library",
        description: "Create a shared UI component library; delete one-off widgets.",
      },
      {
        id: "fix-copy",
        description: "Fix copy: rename confusing objects/fields; standard vocabulary everywhere.",
      },
      {
        id: "progressive-disclosure",
        description: "Add progressive disclosure (advanced options behind toggles).",
      },
      {
        id: "reduce-clicks",
        description:
          "Reduce clicks: batch actions, inline edits, keyboard shortcuts where valuable.",
      },
      {
        id: "improve-empty-states",
        description: "Improve empty states with templates and next-step guidance.",
      },
      {
        id: "undo-destructive",
        description: "Implement “undo” for destructive actions; reduce fear and tickets.",
      },
      {
        id: "deprecate-legacy-ui",
        description: "Deprecate legacy UI routes/components and remove dead CSS/JS.",
      },
    ],
  },
  {
    id: "epic-onboarding-first-value",
    title: "Onboarding to First Value",
    outcome: "minutes, not days",
    tasks: [
      {
        id: "define-first-value",
        description: "Define the “first value” moment and instrument it precisely.",
      },
      {
        id: "canonical-onboarding",
        description: "Ship one canonical onboarding flow (delete variants).",
      },
      {
        id: "preconfigure-defaults",
        description: "Preconfigure sensible defaults and auto-provision required resources.",
      },
      {
        id: "guided-setup",
        description: "Add guided setup with inline validation and clear recovery steps.",
      },
      {
        id: "starter-templates",
        description: "Provide starter templates/sample data for immediate usefulness.",
      },
      {
        id: "role-based-onboarding",
        description: "Add role-based onboarding (admin/operator/viewer).",
      },
      {
        id: "checklist",
        description: "Create checklist tied to real actions and automatic completion.",
      },
      {
        id: "lifecycle-nudges",
        description: "Add lifecycle nudges (email + in-app) triggered by behavior, not time.",
      },
      {
        id: "self-serve-troubleshooting",
        description: "Build self-serve troubleshooting for common setup failures.",
      },
      {
        id: "cohort-dashboards",
        description: "Add cohort dashboards for activation by source/segment.",
      },
      {
        id: "remove-hidden-prereqs",
        description: "Remove hidden prerequisites (docs-only steps) by building them into product.",
      },
    ],
  },
  {
    id: "epic-support-deflection",
    title: "Support Deflection as Product",
    outcome: "make tickets unnecessary",
    tasks: [
      {
        id: "categorize-top-tickets",
        description: "Categorize top 25 ticket types with owners and root-cause classes.",
      },
      {
        id: "improve-error-messages",
        description: "Improve error messages to include cause, impact, and next action.",
      },
      {
        id: "diagnostics-panel",
        description: "Add “diagnostics” panel that runs checks and suggests fixes.",
      },
      {
        id: "self-serve-recovery",
        description: "Implement self-serve recovery actions (retry/resync/reconnect/re-auth).",
      },
      {
        id: "status-indicators",
        description: "Create in-app status indicators (last sync, backlog, degraded mode).",
      },
      {
        id: "customer-timeline",
        description: "Build customer timeline view (changes, errors, deploys, billing events).",
      },
      {
        id: "contextual-help",
        description: "Add help center content embedded contextually (right place, right time).",
      },
      {
        id: "support-macros",
        description: "Create support macros linked to canonical docs and runbooks.",
      },
      {
        id: "proactive-notifications",
        description: "Add proactive notifications for known issues and degraded states.",
      },
      {
        id: "measure-deflection",
        description: "Measure deflection: tickets per active account, repeat-rate by category.",
      },
      {
        id: "kill-ticket-drivers",
        description: "Kill the top 10 ticket drivers with product fixes (not training).",
      },
    ],
  },
  {
    id: "epic-performance-responsiveness",
    title: "Performance & Responsiveness",
    outcome: "speed is UX",
    tasks: [
      {
        id: "identify-slow-interactions",
        description: "Identify top 10 slow interactions (RUM + session replays if available).",
      },
      { id: "p95-targets", description: "Set p95 targets per interaction and publish as budgets." },
      {
        id: "optimize-payloads",
        description: "Optimize payloads (pagination, field selection, compression).",
      },
      { id: "eliminate-n-plus-one", description: "Eliminate N+1 queries and add missing indexes." },
      {
        id: "safe-caching",
        description: "Add caching where safe with correct invalidation rules.",
      },
      {
        id: "reduce-bundle-size",
        description: "Reduce frontend bundle size; remove unused dependencies.",
      },
      {
        id: "optimistic-ui",
        description: "Implement optimistic UI where appropriate (with rollback on failure).",
      },
      {
        id: "async-heavy-work",
        description: "Move heavy work async; show progress states users understand.",
      },
      {
        id: "performance-regression-tests",
        description: "Add performance regression tests in CI for key flows.",
      },
      {
        id: "release-markers",
        description: "Add release markers to performance dashboards for fast blame.",
      },
      {
        id: "speed-release",
        description: "Ship a “Speed Release” and delete perf debt items that regress.",
      },
    ],
  },
  {
    id: "epic-reliability",
    title: "Reliability that Users Feel",
    outcome: "fewer “weird” moments",
    tasks: [
      { id: "slos", description: "Define SLOs for user-critical journeys (not just services)." },
      {
        id: "synthetic-checks",
        description: "Add synthetic checks for signup, payment, core action, and integrations.",
      },
      {
        id: "canary-deploys",
        description: "Implement canary deploys + automated rollback on SLO burn.",
      },
      {
        id: "dependency-failures",
        description: "Harden dependency failures with graceful degradation and fallbacks.",
      },
      {
        id: "idempotency",
        description: "Add idempotency on retried writes to prevent duplicates/corruption.",
      },
      { id: "fix-top-errors", description: "Fix top 20 customer-visible errors by class." },
      {
        id: "safe-mode",
        description: "Add “safe mode” for partial functionality during incidents.",
      },
      {
        id: "bg-job-reliability",
        description: "Improve background job reliability (DLQ, retries, observability).",
      },
      { id: "self-heal", description: "Build “self-heal” actions surfaced to users and support." },
      { id: "status-page", description: "Create status page + clear incident comms cadence." },
      {
        id: "track-reliability-tickets",
        description: "Track reliability-driven tickets/churn and treat as top-tier bugs.",
      },
    ],
  },
  {
    id: "epic-trust-transparency",
    title: "Trust & Transparency",
    outcome: "reduce anxiety, increase adoption",
    tasks: [
      {
        id: "audit-history",
        description: "Add audit history for key objects (who changed what, when).",
      },
      {
        id: "freshness-indicators",
        description: "Show “last updated/last sync” timestamps and data freshness indicators.",
      },
      {
        id: "permission-explanations",
        description: "Add permission explanations (“why can’t I do this?”) with next steps.",
      },
      {
        id: "export-canonical-truth",
        description: "Provide export tools that reflect canonical truth (no stale illusions).",
      },
      {
        id: "destructive-warnings",
        description: "Add warnings/validations before destructive actions (blast radius clarity).",
      },
      {
        id: "retention-settings",
        description: "Publish clear data retention and deletion settings (and actually enforce).",
      },
      {
        id: "integration-health",
        description: "Add user-visible integration health (connected, failing, last event).",
      },
      {
        id: "account-health-dashboard",
        description: "Build account health dashboard for admins (errors, latency, limits).",
      },
      {
        id: "reliability-history",
        description: "Provide reliability history and “trust releases” changelog.",
      },
      {
        id: "privacy-controls",
        description: "Create privacy controls surfaced in-product (where relevant).",
      },
      {
        id: "predictable-releases",
        description: "Reduce surprise: predictable releases and in-app “what changed.”",
      },
    ],
  },
  {
    id: "epic-collaboration-roles",
    title: "Collaboration & Roles",
    outcome: "invite loops with governance",
    tasks: [
      {
        id: "role-templates",
        description: "Create role templates and default permissions for common teams.",
      },
      {
        id: "workspace-structure",
        description: "Add workspace/team structure with clean boundaries.",
      },
      {
        id: "comments-assignments",
        description: "Implement comment/annotation and assignment workflows.",
      },
      { id: "approvals", description: "Add approvals/reviews for high-stakes actions." },
      {
        id: "notifications",
        description: "Build notifications that are configurable and meaningful (not spam).",
      },
      { id: "activity-feed", description: "Add activity feed scoped to what users care about." },
      {
        id: "shared-views",
        description: "Provide shared saved views and dashboards (team habits).",
      },
      {
        id: "bulk-invite",
        description: "Add bulk invite and SCIM readiness where enterprise matters.",
      },
      {
        id: "request-access",
        description: "Implement “request access” flows to reduce admin friction.",
      },
      {
        id: "permission-audit-trails",
        description: "Add audit trails for permission and role changes.",
      },
      {
        id: "centralize-policy",
        description: "Reduce permission model debt by centralizing policy enforcement.",
      },
    ],
  },
  {
    id: "epic-messaging-education",
    title: "Messaging & Education In-Product",
    outcome: "teach without docs rot",
    tasks: [
      {
        id: "contextual-tips",
        description: "Add contextual tips that appear only when needed and then retire.",
      },
      {
        id: "interactive-walkthroughs",
        description: "Build interactive walkthroughs for core flows (skip anytime).",
      },
      {
        id: "template-gallery",
        description: "Provide template gallery with best-practice examples.",
      },
      {
        id: "recipes",
        description: "Add “recipes” for common outcomes (step-by-step inside product).",
      },
      { id: "command-palette", description: "Create a searchable command palette/help launcher." },
      {
        id: "whats-new",
        description: "Add “what’s new” and “what changed” panels tied to outcomes.",
      },
      {
        id: "embedded-videos",
        description: "Embed short explainer videos/GIFs where truly helpful.",
      },
      {
        id: "help-instrumentation",
        description: "Create instrumentation to see which help content reduces failure/tickets.",
      },
      {
        id: "docs-as-code",
        description: "Establish docs-as-code workflow with owners and review dates.",
      },
      {
        id: "remove-stale-help",
        description: "Remove stale help content and replace with productized guidance.",
      },
      {
        id: "education-kpis",
        description: "Track education KPIs: activation lift, fewer errors, fewer tickets.",
      },
    ],
  },
  {
    id: "epic-cx-operating-system",
    title: "CX Operating System",
    outcome: "make improvement continuous",
    tasks: [
      {
        id: "cx-metrics",
        description:
          "Establish CX metrics: activation, task success, time-to-task, tickets, NPS/CSAT.",
      },
      {
        id: "top-friction-review",
        description: "Create weekly “top friction” review: 3 issues in, 3 fixes shipped.",
      },
      {
        id: "ux-debt-budget",
        description: "Implement UX debt budget (fixed % capacity) until targets hit.",
      },
      {
        id: "voice-of-customer",
        description: "Add a “voice of customer” pipeline: feedback → tags → owners → actions.",
      },
      {
        id: "outcome-roadmap",
        description: "Tie roadmap items to customer outcomes (not internal milestones).",
      },
      {
        id: "measure-ux-changes",
        description: "Require pre/post measurement for every UX change.",
      },
      {
        id: "design-qa-checklist",
        description: "Create design QA checklist and enforce before release.",
      },
      {
        id: "session-replay-governance",
        description: "Add session replay/analytics governance (privacy-safe).",
      },
      {
        id: "launch-checklist",
        description: "Build cross-functional launch checklist (support, docs, comms, rollback).",
      },
      {
        id: "public-backlog",
        description: "Maintain a public internal backlog of top friction points (ranked).",
      },
      {
        id: "celebrate-wins",
        description: "Celebrate CX wins with evidence (tickets down, time-to-value down).",
      },
    ],
  },
  {
    id: "epic-data-ai-productization",
    title: "Data & AI Productization",
    outcome: "personalization, copilots, automation with strong guardrails and debt burn baked in",
    tasks: [
      {
        id: "personalization",
        description:
          "Ship personalization that is grounded in explicit user outcomes and permissions.",
      },
      {
        id: "copilot-flows",
        description:
          "Add copilots that accelerate core flows with visible guardrails and recourse.",
      },
      {
        id: "automation",
        description: "Implement automation with approvals, rollbacks, and audit-ready traces.",
      },
      {
        id: "safety-eval",
        description: "Embed safety evaluations and red-teaming for AI/automation before release.",
      },
      {
        id: "data-quality",
        description: "Continuously validate data quality to avoid hallucinated or stale outputs.",
      },
      {
        id: "feedback-loops",
        description: "Instrument feedback loops to learn from user corrections and outcomes.",
      },
      {
        id: "debt-burn",
        description:
          "Pair every AI win with explicit debt burn-down work (performance, UX, infra).",
      },
      {
        id: "policy-guardrails",
        description: "Codify policy guardrails (privacy, export controls, abuse prevention).",
      },
      {
        id: "model-lifecycle",
        description: "Track model lifecycle with versioned rollouts, rollback, and SLOs.",
      },
      {
        id: "cost-discipline",
        description: "Apply cost discipline to AI features with budgets and optimization.",
      },
      {
        id: "transparency",
        description: "Expose provenance, confidence, and limitations to users in-product.",
      },
    ],
  },
];
