# Repository Boundaries

This manifest clarifies what "ships" versus what is experimental or archived. It is descriptive only—no code has moved—and should guide placement of future work.

## Semantics

- **shipping/** – Production-grade apps/services/packages that must stay deployable. Subject to CI, code owners, and release review.
- **labs/** – Experiments, prototypes, and spikes. Fast iteration is encouraged; tests and docs can be lighter, but projects should declare an intent (exploration vs. pre-GA). Prefer time-boxed pilots.
- **archive/** – Frozen artifacts retained for historical context. No active development; only compliance or reference updates land here.

## Rules of the road

- New experiments start in `labs/` (or clearly named lab subdirectories inside the owning domain) with a short `README` that states the question being explored.
- Use explicit naming conventions: `labs/<area>/<experiment-name>` for explorations, `archive/<year>/<project>` for retired work, and `shipping/<unit>` (or existing top-level app/service directories) for production-bound artifacts.
- Do not mix experimental code into shipping directories; graduate work by moving it (in a future PR) once it meets production bars.
- Graduation criteria: documented owner, CI coverage on the critical path, observability hooks, security review as needed, and alignment with the shipping graph.
- When archiving, freeze the code, document the deprecation date, and update the shipping graph if dependencies were removed.

## Graduation workflow (lightweight)

1. Capture learnings in the lab README (what worked/failed, decision reached).
2. Propose graduation by adding the unit to `docs/SHIPPING_GRAPH.md` with an owner and entrypoint.
3. Open a follow-up PR that relocates code into the shipping area and wires it into CI.
4. Update `docs/_meta/repo-map.yaml` (if used) to flip `ships: true` and record the new owner.

Use this document as the source of truth when deciding where new work belongs; keep scope small and avoid reorganizing existing code without product alignment.
