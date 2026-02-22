# Competitive Subsumption Protocol — Summit CI Kit (v4.1)

This kit standardizes Summit-native competitive subsumption workstreams with evidence-first,
license-safe, deterministic artifacts. All outputs align to the Summit Readiness Assertion and
Meta-Governance authority chain. Reference: `docs/SUMMIT_READINESS_ASSERTION.md` and
`docs/governance/META_GOVERNANCE.md`.

## Authority Alignment (Non-Negotiable)

- **Summit Readiness Assertion**: `docs/SUMMIT_READINESS_ASSERTION.md`
- **Constitution + Meta-Governance**: `docs/governance/CONSTITUTION.md`,
  `docs/governance/META_GOVERNANCE.md`
- **Agent Mandates**: `docs/governance/AGENT_MANDATES.md`
- **GA Guardrails**: `docs/ga/TESTING-STRATEGY.md`, `docs/ga/LEGACY-MODE.md`

## Concrete File Tree

```text
summit/
└── docs/
    └── ci/
        ├── competitive-intel/
        │   ├── README.md
        │   ├── PR_STACK_CHECKLIST.md
        │   └── templates/
        │       ├── claims.template.yml
        │       ├── evidence-map.template.yml
        │       └── target.template.yml
        ├── targets/
        │   └── <target_slug>.yml
        └── evidence/
            └── <target_slug>/
                ├── EVIDENCE.md
                ├── SOURCES.md
                ├── CLAIMS.yml
                ├── ARCHITECTURE.md
                ├── CONTRACTS.md
                ├── OPS.md
                ├── QUALITY.md
                ├── MAPPING.md
                ├── GAPS.md
                ├── DECISIONS.md
                └── samples/
```

## Template Usage

1. Copy `templates/target.template.yml` into `docs/ci/targets/<target_slug>.yml`.
2. Copy `templates/claims.template.yml` into `docs/ci/evidence/<target_slug>/CLAIMS.yml`.
3. Copy `templates/evidence-map.template.yml` into `evidence/map.yml` if a registry is required
   by the evidence ID gate.
4. Use `PR_STACK_CHECKLIST.md` for each PR in the stack.

## Determinism & Evidence Rules

- **No-copy policy**: Only public, license-respecting sources; attribution required.
- **Determinism**: Stable ordering, no timestamps in governed outputs.
- **Evidence-first**: Raw evidence bundle before narrative summaries.
- **Move the fight to paper**: cite files, tags, or URLs in SOURCES + CLAIMS.

## MAESTRO Threat Modeling Alignment

When proposing or implementing changes, explicitly record:

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: goal manipulation, prompt injection, tool abuse.
- **Mitigations**: measurable controls reducing confidentiality/integrity/safety risk.

