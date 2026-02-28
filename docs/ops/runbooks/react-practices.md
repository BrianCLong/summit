# React Practices Enforcement Runbook

## Overview
This runbook covers the triage and mitigation of CI failures caused by the React Boundary Analyzer and Cache/Streaming Validator.

## Debugging Violations

### RBP-001 (Boundary Violation)
A server component is improperly importing a module marked with `"use client"`.
- **Fix:** Move the client-only logic into its own client component, or pass it as a prop from a client component higher in the tree.

### RBP-002 (Cache Misconfig)
A route is missing an explicit cache directive.
- **Fix:** Add `export const revalidate = ...` or `export const dynamic = ...` to the route component file.

### RBP-003 (Streaming Regression)
An async route is missing a `<Suspense>` boundary, which degrades TTFB.
- **Fix:** Wrap the async operation or the component rendering it in a `<Suspense>` component.

## SLOs
- **0 critical boundary violations** on the `main` branch.
