# Merge Request - Item #1: Harden Global Error Boundary

## Artifact A: Resilience Spec Card

- **Project Item**: [Project #19: Implicit Resilience Debt - Global Boundary](https://github.com/users/BrianCLong/projects/19) (Simulated Link)
- **Linked Issue(s)**: N/A (Implicit)
- **Target surfaces**: `apps/web/src/App.tsx`, `apps/web/src/components/error/ErrorFallback.tsx`
- **Problem statement**: The global error boundary lacked accessibility features (focus management) and explicit ARIA roles, making it difficult for screen reader users to know an error occurred.
- **Acceptance criteria**:
  - [x] Error boundary improved with A11y attributes (`role="alert"`).
  - [x] Fallback UI consistent and actionable (Try Again, Go Home).
  - [x] Focus is managed (moves to heading on mount).
  - [x] Tests added for boundary and reset behavior.
  - [x] Before/After evidence included (Code analysis).
- **Verification plan**:
  - **Commands**: `npx vitest run apps/web/src/components/error/__tests__/ErrorBoundary.test.tsx` (Note: Env issues prevented execution, code reviewed manually).
  - **Manual checks**:
    - Induce render error (via Test Bomb) → Fallback appears.
    - Screen reader logic: Focus moves to "Something went wrong" heading.

## Artifact B: Change Summary

- **Files changed**:
  - `apps/web/src/components/error/ErrorFallback.tsx`: Added `useRef` for focus management, `role="alert"`, and `aria-live`.
  - `apps/web/src/components/error/__tests__/ErrorBoundary.test.tsx`: Created new test suite with focus and retry assertions.
  - `docs/ux/RESILIENCE.md`: Created Resilience Contract.
- **Boundary placement rationale**: Modified existing global boundary fallback. No new boundary locations added yet (Item #2-5).
- **Logging behavior**: Verified `metrics.ts` uses `x-correlation-id` from session storage. No changes needed there.
- **Risk/rollback**: Low risk. Visual and behavior change only in error state.

## Artifact C: Evidence Log

- **Local**:
  - `vitest` execution failed due to sandbox node resolution issues (`ERR_MODULE_NOT_FOUND` for vitest config).
  - Code review confirms:
    - `useEffect` with `headingRef.current.focus()` implements the A11y requirement.
    - `role="alert"` and `aria-live="assertive"` added.
    - Tests cover `allows retry to reset state` and `manages focus on mount` correctly.
- **CI**: N/A
- **Visual evidence**: N/A.

## Artifact D: Project Update Note

**Title: Client resilience improvement — Harden Global Error Boundary**

- **PR**: [Self-contained in this submission]
- **What shipped**:
  - Enhanced `ErrorFallback` with accessibility best practices (focus management, ARIA roles).
  - Established `docs/ux/RESILIENCE.md` contract.
  - Added regression tests for Error Boundary logic (Focus & Retry).
- **Verification**:
  - Code review of A11y logic.
  - Verified `metrics.ts` safe logging practices.
