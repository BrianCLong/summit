# Repository Assumptions Log — Formae Subsumption Slice

## Verified

- Repository root is `BrianCLong/summit` working tree.
- Roadmap status file exists at `docs/roadmap/STATUS.json`.

## Assumed (Pending Local/CI Confirmation)

- Existing evidence schema must not be broken by new multi-cloud artifacts.
- Existing CI check names must remain stable; add new checks without renaming incumbents.
- Multi-cloud implementation lane can begin as standards/docs + deterministic artifact contract before runtime wiring.

## Must-Not-Touch Constraints

- Core evidence contracts and required CI gate names.
- Release pipeline behavior outside additive workflow integration.

## Validation Checklist

- [ ] Confirm canonical evidence schema filename and required fields.
- [ ] Confirm CI workflow naming conventions and required checks.
- [ ] Confirm implementation zone ownership for `pkg`/`internal`/`packages` equivalent paths.
- [ ] Confirm naming conventions for new artifact files and policy gate IDs.
