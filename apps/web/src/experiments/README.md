# Frontend Experiments (Isolated)

Each experiment lives in its own directory under `apps/web/src/experiments/<experiment-id>/`.

**Rules**

- Use `ExperimentalGate` to render any experiment UI.
- Keep experiments read-only and avoid GA data mutations.
- Never expose experiments in default navigation.
- Register every experiment in `registry.ts` with an owner + expiration.
- Use the `ExperimentalBanner` to keep UX affordances consistent.

See `apps/web/docs/EXPERIMENTAL_PARALLELISM_SPEC.md` for the full model.
