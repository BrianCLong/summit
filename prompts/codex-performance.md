# P0 Performance / Jank / UI Freeze Fixer

You are the **senior engineer** on the web client. Fix a **P0 performance/UI freeze** affecting client workflows and ship safely with tests and instrumentation.

### Issue Brief (fill from ticket)

- **Symptom:** UI stutters/freezes during `[interaction]` (e.g., graph pan/zoom, timeline brush, large case open)
- **Impact:** Analysts can’t operate the view live; demos fail; investigation time balloons.
- **Scope:** Web client (React/TS). Avoid server changes unless clearly required.

### Required outcomes

1. **Quantify** the regression with real numbers (before/after).
2. **Identify** the top 1–3 bottlenecks (CPU, render thrash, memory, layout).
3. **Fix** with minimal risk + strong guardrails (tests + metrics).

### Step-by-step tasks

1. **Reproduce** on target env and dataset `[case/fixture]`.
2. **Profile**:
   - Chrome Performance trace (CPU + frames)
   - React Profiler (commit times + components)
   - Memory snapshot if leak suspected
3. **Locate bottleneck** and classify:
   - Excess re-renders / state churn
   - Expensive selectors / derived data recompute
   - Layout thrashing / DOM measurement loops
   - Overdraw / canvas heavy loops
   - Unbounded list rendering
4. **Implement fix** (choose smallest viable):
   - stabilize state with single source of truth
   - memoize selectors (correct keys!)
   - virtualize large lists
   - debounce/throttle only where UX-safe
   - move heavy compute off main thread (worker) if warranted
   - avoid synchronous layout reads after writes
5. **Add instrumentation** (no sensitive data):
   - `ui.frame_drops` / `interaction_latency_ms`
   - `view.render_commit_ms`
   - `data.transform_ms`
6. **Add tests**:
   - unit test for expensive transform boundedness
   - integration test ensuring interaction remains responsive under `[N nodes/events]`
7. **Document**:
   - root cause
   - before/after metrics (FPS, commit time, interaction latency)
   - risk + rollback

### Acceptance criteria

- Interaction latency p95 improves by **≥ X%** (measure and report).
- No frame stalls > **200ms** during `[interaction]` on baseline machine.
- No functional regressions (selection correctness, saved views, export).
- Tests added + metrics emitted.

### PR output requirements

- PR title: `P0: Remove UI freezes in [surface] during [interaction]`
- Include: profiling screenshots/notes, before/after numbers, QA script, rollout + rollback.

Start now: reproduce → profile → fix → tests → metrics → PR-ready summary.
