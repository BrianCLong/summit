# Prompt: Evening Standup Note (v1)

## Purpose
Create an evening standup note for the Summit repository using a provided update summary. The output must be a single Markdown file stored under `docs/standups/` and must include evidence links to the referenced issues or sources.

## Required Outputs
1. `docs/standups/<YYYY-MM-DD>-evening-standup.md`
2. Update `docs/roadmap/STATUS.json` with:
   - `last_updated` timestamp
   - `revision_note` summarizing the standup update

## Content Requirements
- Title: `Evening Standup - <repo> (<YYYY-MM-DD>)`
- Sections:
  - Recent Accomplishments
  - Open Work
  - Blockers
  - Tomorrow
  - Evidence Links
- Use bullet lists for each section.
- Include issue or source links for every claim.
- Maintain concise, factual language; no placeholders.

## Verification
- Tier: C (lightweight)
- Evidence: Updated standup note + STATUS.json
