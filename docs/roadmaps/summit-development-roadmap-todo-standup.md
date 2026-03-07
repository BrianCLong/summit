# Summit Development Roadmap — Todo Standup Snapshot

## Summit Readiness Assertion Alignment

This artifact is governed by `docs/SUMMIT_READINESS_ASSERTION.md` and is intentionally constrained
to publicly visible issue activity feed signals.

- Human-readable source: this markdown file.
- Machine-readable source: `docs/roadmaps/summit-development-roadmap-todo-standup.snapshot.json`.

## Classification Method

An issue is treated as **currently in Todo** when public activity shows:

1. `moved this to Todo in Summit Development Roadmap`, and
2. no later move to `In Progress` or `Done` in visible issue activity.

This definition is intentionally constrained until project API export is available.

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

- Keep Todo issues linked to evidence artifacts and acceptance criteria.
- Prioritize quality and golden-path confidence before expanding feature surface.

### Next

- Move one quality issue (`#11025` or `#11176`) to `In Progress` with explicit owner and test exit criteria.
- Move one hardening issue (`#10132`) to `In Progress` with security-gate evidence targets.

### Blockers

- Public activity feed is not a complete source of truth for internal project metadata.
- Board throughput metrics remain deferred pending project API export.

## Validation Checklist

- JSON snapshot parses: `node -e "JSON.parse(require('fs').readFileSync('docs/roadmaps/summit-development-roadmap-todo-standup.snapshot.json','utf8'))"`
- Roadmap status parses: `node -e "JSON.parse(require('fs').readFileSync('docs/roadmap/STATUS.json','utf8'))"`
- Boundary check remains clean: `node scripts/check-boundaries.cjs`

## Governance Notes

- Any discrepancy between this snapshot and live board metadata is a **Governed Exception** pending project API export.
- Refresh cadence: daily during sprint windows, weekly otherwise.
