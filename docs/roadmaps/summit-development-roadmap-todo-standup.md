# Summit Development Roadmap — Todo Standup Snapshot

## Summit Readiness Assertion Alignment

This snapshot is a governed evidence artifact aligned to `docs/SUMMIT_READINESS_ASSERTION.md` and is
intentionally constrained to publicly visible GitHub issue activity feed signals.

## Method

An issue is treated as **currently in Todo** when public activity shows:

1. `moved this to Todo in Summit Development Roadmap`, and
2. no later move to `In Progress` or `Done` in visible issue activity.

## Current Todo Issues (Public Visibility)

- [#9791](https://github.com/BrianCLong/summit/issues/9791) — **IG Oct25**
- [#10132](https://github.com/BrianCLong/summit/issues/10132) — **Policy & Security Hardening**
- [#11176](https://github.com/BrianCLong/summit/issues/11176) — **Create Playwright test: Investigation creation → Entity addition**
- [#11349](https://github.com/BrianCLong/summit/issues/11349) — **Accessibility/UX**
- [#11025](https://github.com/BrianCLong/summit/issues/11025) — **Unit tests**
- [#11170](https://github.com/BrianCLong/summit/issues/11170) — **Test golden path in consolidated frontend**
- [#11635](https://github.com/BrianCLong/summit/issues/11635) — **HTTP/CSV reference connector**

## Transitions Out of Todo

- [#189](https://github.com/BrianCLong/summit/issues/189) — **Load testing and optimization** moved from Todo to Done.

## Standup View

### Today

- Keep roadmap backlog items in Todo linked to executable evidence artifacts.
- Prioritize test hardening and golden-path confidence work before feature surface expansion.

### Next

- Move one quality-focused issue (`#11025` or `#11176`) to `In Progress` with owner + acceptance criteria.
- Move one security-focused issue (`#10132`) to `In Progress` with gate evidence targets.

### Blockers

- Public activity feed visibility is not a complete source of truth for internal project metadata.
- Board-level throughput metrics remain constrained without project API export.

## Governance Notes

- Any discrepancy between this snapshot and project-board state is a **Governed Exception** pending project API export.
- Refresh cadence: daily during sprint execution windows, weekly otherwise.
