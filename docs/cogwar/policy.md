# Cognitive Warfare Policy (Defensive-Only)

## Defensive-Only Contract

All cognitive-warfare work is constrained to **detect, attribute, warn, and harden**. Any request
or code path that attempts persuasion optimization, microtargeting, or influence automation must
be denied by default.

## Policy Gates

- `policy/defensive_only.yml` defines deny-by-default keyword gates.
- `policy/retention.yml` sets default retention to the shortest permissible window.
- `policy/innovation_flags.yml` keeps high-risk modules OFF by default.

## Auditability

- All evidence artifacts must reference an Evidence ID.
- Policy tests must include explicit offensive-request fixtures.
