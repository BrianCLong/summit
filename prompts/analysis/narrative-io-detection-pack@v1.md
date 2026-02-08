# Prompt: Narrative & Influence Ops Detection Pack (v1)

## Mission
Create a governed analysis report that maps a user-supplied research bundle to actionable narrative/IO detection implications, with explicit validation gates and evidence-first posture. Update the roadmap status to track the initiative.

## Required Outputs

1. **Analysis report** under `docs/analysis-reports/` that:
   - Lists all provided sources verbatim.
   - Separates assumptions from grounded claims.
   - Defines validation steps before implementation.
   - Specifies deterministic, evidence-first implications.
   - Includes MAESTRO threat model alignment.
2. **Roadmap update** in `docs/roadmap/STATUS.json`:
   - Add a new initiative entry.
   - Update `last_updated` and `revision_note`.
   - Adjust totals as needed.

## Constraints

- Do **not** copy restricted source text; only summarize at a high level.
- Mark any unverified assertions as **Deferred pending source review**.
- Follow the evidence-first posture and governance gates.

## Completion Criteria

- Report is deterministic and audit-ready.
- Roadmap entry added and consistent with the initiative.
- No policy or security controls are weakened.
