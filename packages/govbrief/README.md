# GovBrief Pipeline

GovBrief provides a repeatable and auditable pipeline for ingesting public .gov research, extracting structured claims with provenance, and composing Proof-Carrying Strategy (PCS) briefs.

## Features

- Live fetch with automatic Wayback Machine fallback and SHA-256 hashing.
- HTML normalization into line-anchored sections with metadata extraction.
- Heuristic claim mining with ideology tagging and evidence anchors.
- Safety review filters that block high-severity risks before publication.
- PCS brief composer with executive summary, findings, implications, and citations.

## CLI Usage

Build the package once and run the CLI commands from the repository root:

```bash
npm run --workspace=@summit/govbrief build
node packages/govbrief/dist/cli.js fetch "https://nij.ojp.gov/topics/articles/what-nij-research-tells-us-about-domestic-terrorism"
# => Artifacts written to artifacts/<sha256>

node packages/govbrief/dist/cli.js brief artifacts/<sha256>
# => Brief generated at artifacts/<sha256>/brief.md
```

Use `--output` to direct artifacts to a different directory:

```bash
node packages/govbrief/dist/cli.js fetch --output tmp-artifacts "<url>"
```

## Outputs

The fetch step writes:

- `raw.html` – captured article HTML (live or Wayback).
- `clean.txt` – normalized section text with paragraph spacing.
- `article.json` – metadata and section structure.
- `claims.json` – ≥10 claim records with evidence anchors.
- `provenance.json` – retrieval timestamps, URLs, and SHA-256.
- `safety.json` – safety review notes (brief generation blocks on high severity).

The brief step emits `brief.md` with an executive summary, key findings linked to section anchors, prevention implications, assumptions, falsifiers, safety status, and citations.

## Safety Notes

- The safety review flags operational language, doxxing risks, and dehumanizing terms.
- Claims are word-limited to keep quotations under 25 words and avoid amplification.
- Brief generation halts automatically if any high-severity flag is recorded.
