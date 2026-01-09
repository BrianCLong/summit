# GA RC Release Pipeline Prompt

Objective: implement a deterministic, policy-driven GA release candidate pipeline that tags RCs from main, assembles release notes from immutable inputs, and publishes draft GitHub Releases with evidence and trust artifacts attached.

Scope:

- .github/workflows/
- scripts/release/
- docs/release/
- docs/roadmap/STATUS.json
- agents/examples/
- prompts/registry.yaml

Constraints:

- Build + verify before tagging.
- RC tags must originate from main (or a declared governed exception).
- Draft-by-default releases; publish only with explicit approval.
- Release notes must be deterministic and include trust snapshot assurance + evidence digests.

Outputs:

- release-rc workflow
- release notes assembler script + tests
- release policy + RC runbook
- roadmap status update
