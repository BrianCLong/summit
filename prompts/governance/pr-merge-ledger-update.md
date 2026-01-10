# Prompt: PR Merge Ledger Update

## Objective

Maintain authoritative merge records in `PR_MERGE_LEDGER.md`, ensuring each epic entry is backed by default-branch merge evidence and approved metadata.

## Scope

- Update `PR_MERGE_LEDGER.md` to add, verify, or defer merge entries.
- Use only verified merge evidence (default-branch history, PR metadata) when marking entries as merged.
- If evidence is missing, mark entries as **Deferred pending merge verification** and specify the required evidence source.

## Required Output

- A clear update to `PR_MERGE_LEDGER.md` that reflects verified merge status.
- No speculative claims; defer status when evidence is incomplete.

## Constraints

- Keep entries aligned to epic identifiers (A–C, B1–B3, C1–C2 as applicable).
- Prefer concise, auditable language.
