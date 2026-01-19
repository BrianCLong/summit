# Branch Protection Enforcement Alignment Prompt

## Objective

Align repository branch protection documentation and ruleset payload generation with the
required checks policy so GitHub enforcement matches policy-as-code.

## Scope

- Update branch protection documentation under `.github/` and `docs/ci/`.
- Add or refine CI tooling in `scripts/ci/` that derives enforcement payloads from
  `docs/ci/REQUIRED_CHECKS_POLICY.yml`.
- Update `docs/roadmap/STATUS.json` to capture the governance change.
- Add task-spec artifacts under `agents/examples/`.

## Non-Negotiables

- Required status checks must be sourced from `docs/ci/REQUIRED_CHECKS_POLICY.yml`.
- No placeholders or TODOs in documentation or scripts.
- Output must be deterministic and suitable for CI enforcement.
