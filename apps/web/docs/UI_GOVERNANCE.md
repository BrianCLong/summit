# UI Governance Policy

**Version:** 1.0.0
**Last Updated:** 2026-01-09
**Owner:** Platform Engineering

This policy defines enforceable standards for UI consistency, accessibility, and maintainability in `apps/web`. The goal is helpful enforcement—clear guidance, minimal false positives, and an auditable waiver process for exceptional cases.

---

## Token Rules

All new UI code **must** use design tokens for:

| Property | Required Pattern | Violation |
|----------|-----------------|-----------|
| Colors | `var(--ds-color-*)` or Tailwind classes | Hard-coded hex (`#fff`, `#3b82f6`) |
| Spacing | `var(--ds-space-*)` or Tailwind classes | Literal px/rem in inline styles |
| Typography | `var(--ds-font-*)` or Tailwind classes | Hard-coded font-size in inline styles |
| Border Radius | `var(--ds-radius-*)` or Tailwind classes | Literal px in inline styles |

**Source of truth:** `src/theme/tokens.ts`

### Examples

```tsx
// ✅ Correct
<div className="p-4 bg-background text-foreground" />
<div style={{ padding: tokenVar('ds-space-md') }} />

// ❌ Violation
<div style={{ backgroundColor: '#3b82f6' }} />
<div style={{ padding: '16px' }} />
```

---

## Primitive Rules

New components **must** use shared primitives from `src/components/ui/`:

| Primitive | Use Instead Of |
|-----------|---------------|
| `Button` | Raw `<button>`, ad-hoc styled buttons |
| `Card` | Custom card wrappers with duplicate styling |
| `Alert` | Ad-hoc error/warning boxes |
| `EmptyState` | One-off empty/no-data displays |
| `Loading` | Custom spinners, skeleton patterns |

### Examples

```tsx
// ✅ Correct
import { Button } from '@/components/ui/Button'
<Button onClick={handleClick}>Submit</Button>

// ❌ Violation
<button className="bg-blue-500 text-white px-4 py-2">Submit</button>
```

---

## State Triplet Rules

Async pages **must** implement the state triplet pattern:

1. **Loading:** Use `Loading` or `Skeleton` from `src/components/ui/`
2. **Error:** Use `Alert` with `role="alert"` or dedicated error boundary
3. **Empty:** Use `EmptyState` with actionable guidance

Pages that fetch data without all three states are considered incomplete.

---

## Accessibility Baseline

All interactive components must:

| Rule | Requirement |
|------|-------------|
| Labels | Form controls have associated labels (explicit or aria-label) |
| Headings | Pages have exactly one `<h1>` with logical heading hierarchy |
| Landmarks | Main content wrapped in `<main>` |
| Focus | Modals/overlays trap focus and restore on close |
| Roles | Error messages use `role="alert"` |

Validated by: `eslint-plugin-jsx-a11y` and `verify:ui`

---

## Exception/Waiver Process

When a rule cannot be followed, add an entry to `apps/web/ui-governance.allowlist.json`:

```json
{
  "file": "src/legacy/OldComponent.tsx",
  "rule": "no-hardcoded-colors",
  "reason": "Third-party charting library requires hex values",
  "owner": "team-lead@example.com",
  "expires": "2026-06-01"
}
```

**Requirements:**
- `reason` must explain why the violation is necessary
- `owner` must be a team member accountable for remediation
- `expires` must be a valid date (max 6 months from creation)
- Expired waivers cause CI to fail

Waivers are audited in release evidence bundles.

---

## Enforcement

### Local Development

```bash
pnpm -C apps/web verify:ui
```

Runs in <2 seconds. Reports violations with file:line and suggested fix.

### CI

The `verify:ui` check runs on all PRs touching `apps/web/**` paths.

### Remediation Guidance

| Violation | Fix |
|-----------|-----|
| Hard-coded hex color | Replace with Tailwind class or `var(--ds-color-*)` |
| Raw `<button>` | Import and use `Button` from `@/components/ui/Button` |
| Missing loading state | Add `Loading` component to async boundary |
| Missing `role="alert"` | Add role attribute to error messages |

---

## References

- [Design System Tokens](./DESIGN_SYSTEM_TOKENS.md)
- [Accessibility Guide](./ACCESSIBILITY.md)
- Primitives: `src/components/ui/`
- Tokens: `src/theme/tokens.ts`
