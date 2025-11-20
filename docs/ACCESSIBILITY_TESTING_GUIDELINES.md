# Accessibility Testing Guidelines & Checklist

> **Last Updated**: 2025-11-20
> **Target**: WCAG 2.1 AA Compliance (with WCAG 2.2 AAA aspirational goals)
> **Owner**: Engineering Team

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Strategy](#testing-strategy)
3. [Automated Testing](#automated-testing)
4. [Manual Testing](#manual-testing)
5. [Component Checklist](#component-checklist)
6. [Page-Level Checklist](#page-level-checklist)
7. [Tools & Resources](#tools--resources)
8. [CI/CD Integration](#cicd-integration)
9. [Common Issues & Solutions](#common-issues--solutions)

---

## Overview

Accessibility is a fundamental requirement for the Summit/IntelGraph platform. These guidelines ensure that all features are usable by people with disabilities, including those who use:

- **Screen readers** (NVDA, JAWS, VoiceOver)
- **Keyboard-only navigation**
- **Voice control software**
- **Screen magnification**
- **High contrast modes**
- **Reduced motion preferences**

### Success Criteria

- ✅ Zero critical/serious automated violations (axe-core)
- ✅ 100% keyboard navigability for interactive elements
- ✅ Lighthouse accessibility score ≥ 95
- ✅ Manual screen reader testing passes
- ✅ WCAG 2.1 AA compliance verified

---

## Testing Strategy

### Three-Tier Approach

1. **Component Level**: Unit tests with `vitest-axe` and `jest-axe`
2. **Integration Level**: Feature tests with keyboard/screen reader simulation
3. **End-to-End Level**: Full page tests with `@axe-core/playwright`

### When to Test

- ✅ **Before every commit**: Run automated tests locally
- ✅ **During PR review**: Full accessibility test suite in CI
- ✅ **Before feature completion**: Manual testing with assistive tech
- ✅ **Quarterly**: Comprehensive accessibility audit

---

## Automated Testing

### Component Tests (Vitest + jest-axe)

**Location**: `apps/web/tests/accessibility/`

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(<MyComponent />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

**Run tests**:
```bash
pnpm test:accessibility           # Run all accessibility tests
pnpm test -- MyComponent.test.tsx # Run specific test
```

### E2E Tests (Playwright + @axe-core/playwright)

**Location**: `e2e/client/accessibility.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('page should not have accessibility violations', async ({ page }) => {
  await page.goto('/')

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()

  expect(accessibilityScanResults.violations).toEqual([])
})
```

**Run tests**:
```bash
pnpm e2e                          # Run all E2E tests
pnpm e2e -- accessibility.spec.ts # Run accessibility tests only
```

### CI Pipeline

Accessibility tests run automatically on:
- Every pull request
- Commits to `main` branch
- Nightly builds

**Required checks**:
- ✅ No critical/serious axe violations
- ✅ Lighthouse accessibility score ≥ 95
- ✅ All keyboard navigation tests pass

---

## Manual Testing

### Screen Reader Testing

**Recommended Tools**:
- **Windows**: NVDA (free) or JAWS (commercial)
- **macOS**: VoiceOver (built-in)
- **Linux**: Orca (free)

**Testing Checklist**:

- [ ] Navigate through page using Tab/Shift+Tab
- [ ] All interactive elements are announced properly
- [ ] Form labels are associated with inputs
- [ ] Error messages are announced
- [ ] Dynamic content updates are announced (aria-live)
- [ ] Images have descriptive alt text
- [ ] Skip links work correctly
- [ ] Headings form a logical hierarchy

**VoiceOver Quick Start** (macOS):
```
Cmd+F5               : Toggle VoiceOver
VO keys              : Control+Option
VO+Right Arrow       : Navigate forward
VO+Left Arrow        : Navigate backward
VO+Space             : Activate element
VO+A                 : Read entire page
```

**NVDA Quick Start** (Windows):
```
Ctrl+Alt+N           : Start NVDA
Insert (or Caps)     : NVDA modifier key
NVDA+Down Arrow      : Read next item
NVDA+Up Arrow        : Read previous item
NVDA+Space           : Activate element
NVDA+Down Arrow (x2) : Read entire page
```

### Keyboard Navigation Testing

**Essential Shortcuts**:
- `Tab`: Move focus forward
- `Shift+Tab`: Move focus backward
- `Enter`: Activate buttons/links
- `Space`: Activate buttons/checkboxes
- `Arrow keys`: Navigate within components (select, radio groups, etc.)
- `Esc`: Close modals/dialogs

**Testing Checklist**:

- [ ] All interactive elements are keyboard accessible
- [ ] Focus order is logical
- [ ] Focus is visible (focus-visible indicators)
- [ ] No keyboard traps (can escape from all components)
- [ ] Skip links allow bypassing navigation
- [ ] Modal dialogs trap focus appropriately
- [ ] Focus is restored when dialogs close

### Visual Testing

**Testing Checklist**:

- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)
- [ ] Information not conveyed by color alone
- [ ] Text is resizable up to 200% without loss of functionality
- [ ] Focus indicators are clearly visible
- [ ] Touch targets are at least 44x44 pixels
- [ ] Content works in high contrast mode
- [ ] Animations respect prefers-reduced-motion

**Tools**:
- Chrome DevTools: Lighthouse accessibility audit
- Browser extensions: axe DevTools, WAVE, Accessibility Insights
- Color contrast: WebAIM Contrast Checker, Stark

---

## Component Checklist

### All Components

- [ ] **Semantic HTML**: Use appropriate elements (button, nav, main, etc.)
- [ ] **Keyboard Support**: All interactive elements are keyboard accessible
- [ ] **Focus Management**: Focus is visible and properly managed
- [ ] **ARIA**: Use ARIA attributes when native HTML is insufficient
- [ ] **Labels**: All form inputs have associated labels
- [ ] **Error Handling**: Errors are clearly announced and associated with inputs
- [ ] **Testing**: Component has automated accessibility tests

### Buttons

- [ ] Use `<button>` element (not `<div>` with onClick)
- [ ] Has accessible name (text content or aria-label)
- [ ] Has `:focus-visible` styles
- [ ] `disabled` state is properly conveyed
- [ ] Icon-only buttons have `aria-label`

```tsx
// ✅ Good
<Button aria-label="Close dialog">
  <X className="h-4 w-4" aria-hidden="true" />
</Button>

// ❌ Bad
<div onClick={handleClick}>
  <X />
</div>
```

### Forms

- [ ] All inputs have associated `<label>` elements
- [ ] Required fields are indicated (asterisk + aria-required)
- [ ] Error messages are associated with inputs (aria-describedby)
- [ ] Error messages are announced to screen readers
- [ ] Form validation provides clear, actionable feedback
- [ ] Field groupings use `<fieldset>` and `<legend>`

```tsx
// ✅ Good
<div>
  <label htmlFor="email">Email *</label>
  <input
    id="email"
    type="email"
    required
    aria-required="true"
    aria-describedby="email-error"
  />
  <span id="email-error" role="alert">
    {error}
  </span>
</div>
```

### Modals/Dialogs

- [ ] Has `role="dialog"` and `aria-modal="true"`
- [ ] Has accessible name (aria-labelledby or aria-label)
- [ ] Focus is trapped within modal
- [ ] Focus is set to first focusable element on open
- [ ] Focus is restored to trigger element on close
- [ ] Can be closed with `Esc` key
- [ ] Overlay click closes modal (with confirmation if needed)

```tsx
// ✅ Good
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
>
  <h2 id="dialog-title">Confirm Action</h2>
  {/* ... */}
</div>
```

### Tables

- [ ] Use semantic table elements (`<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`)
- [ ] Header cells have `scope` attribute (col or row)
- [ ] Complex tables have `<caption>` or aria-label
- [ ] Data tables are not used for layout
- [ ] Responsive tables maintain accessibility

```tsx
// ✅ Good
<table>
  <caption>User list</caption>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Email</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>John Doe</td>
      <td>john@example.com</td>
    </tr>
  </tbody>
</table>
```

### Navigation

- [ ] Uses `<nav>` element with aria-label
- [ ] Active page has `aria-current="page"`
- [ ] Navigation items are keyboard accessible
- [ ] Skip link allows bypassing navigation
- [ ] Mobile navigation is keyboard and screen reader accessible

```tsx
// ✅ Good
<nav aria-label="Main navigation">
  <NavLink to="/dashboard" aria-current={isActive ? 'page' : undefined}>
    Dashboard
  </NavLink>
</nav>
```

### Images

- [ ] Decorative images have `alt=""` or `role="presentation"`
- [ ] Informative images have descriptive alt text
- [ ] Complex images (charts, diagrams) have extended descriptions
- [ ] Icons used for interaction have aria-label on parent button

```tsx
// ✅ Good
<img src="logo.png" alt="IntelGraph Platform" />
<img src="decorative.png" alt="" role="presentation" />
<button aria-label="Settings">
  <SettingsIcon aria-hidden="true" />
</button>
```

---

## Page-Level Checklist

### Every Page Should Have

- [ ] **Skip Links**: Allow keyboard users to skip to main content
- [ ] **Landmarks**: Proper use of `<header>`, `<nav>`, `<main>`, `<footer>`
- [ ] **Headings**: Logical heading hierarchy (h1, h2, h3, etc.)
- [ ] **Page Title**: Descriptive `<title>` element
- [ ] **Language**: `lang` attribute on `<html>` element
- [ ] **Keyboard Navigation**: All functionality is keyboard accessible
- [ ] **Focus Management**: Focus is managed appropriately on route changes
- [ ] **ARIA Live Regions**: Dynamic content updates are announced

### Example Page Structure

```tsx
<div>
  {/* Skip Links */}
  <a href="#main-content" className="skip-link">
    Skip to main content
  </a>

  {/* Navigation */}
  <nav id="navigation" aria-label="Main navigation">
    {/* ... */}
  </nav>

  {/* Header */}
  <header role="banner">
    <h1>Page Title</h1>
  </header>

  {/* Main Content */}
  <main id="main-content" role="main" aria-label="Main content">
    {/* ... */}
  </main>

  {/* Footer */}
  <footer role="contentinfo">
    {/* ... */}
  </footer>
</div>
```

---

## Tools & Resources

### Automated Testing Tools

| Tool | Purpose | Installation |
|------|---------|--------------|
| **jest-axe** / **vitest-axe** | Component accessibility testing | `pnpm add -D jest-axe vitest-axe` |
| **@axe-core/playwright** | E2E accessibility testing | `pnpm add -D @axe-core/playwright` |
| **axe DevTools** | Browser extension for manual testing | [Chrome](https://chrome.google.com/webstore) / [Firefox](https://addons.mozilla.org) |
| **Lighthouse** | Automated audits in Chrome DevTools | Built into Chrome |

### Screen Readers

| Tool | Platform | Cost | Download |
|------|----------|------|----------|
| **NVDA** | Windows | Free | [nvaccess.org](https://www.nvaccess.org/) |
| **JAWS** | Windows | Commercial | [freedomscientific.com](https://www.freedomscientific.com/products/software/jaws/) |
| **VoiceOver** | macOS / iOS | Free | Built-in (Cmd+F5) |
| **Orca** | Linux | Free | Built into GNOME |
| **TalkBack** | Android | Free | Built-in |

### Reference Materials

- **WCAG 2.1**: [w3.org/WAI/WCAG21/quickref](https://www.w3.org/WAI/WCAG21/quickref/)
- **ARIA Authoring Practices**: [w3.org/WAI/ARIA/apg](https://www.w3.org/WAI/ARIA/apg/)
- **WebAIM**: [webaim.org](https://webaim.org/)
- **A11y Project**: [a11yproject.com](https://www.a11yproject.com/)
- **Inclusive Components**: [inclusive-components.design](https://inclusive-components.design/)

---

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/accessibility.yml`

```yaml
name: Accessibility Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  accessibility:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install

      - name: Run component accessibility tests
        run: pnpm test:accessibility

      - name: Build application
        run: pnpm build

      - name: Run E2E accessibility tests
        run: pnpm e2e -- accessibility.spec.ts

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: accessibility-test-results
          path: |
            apps/web/test-results/
            e2e/test-results/
```

### Required CI Checks

- ✅ **Component Tests**: Zero violations in unit tests
- ✅ **E2E Tests**: Zero critical/serious violations
- ✅ **Lighthouse**: Accessibility score ≥ 95
- ✅ **Build**: No TypeScript errors related to accessibility props

---

## Common Issues & Solutions

### Issue: "Elements must have sufficient color contrast"

**Solution**:
- Ensure text has at least 4.5:1 contrast ratio (3:1 for large text)
- Use WebAIM Contrast Checker to verify
- Update theme colors in `tailwind.config.js`

```tsx
// ❌ Bad: Insufficient contrast
<p className="text-gray-400 bg-gray-100">Low contrast text</p>

// ✅ Good: Sufficient contrast
<p className="text-gray-900 bg-gray-100">High contrast text</p>
```

### Issue: "Form elements must have labels"

**Solution**:
- Use `<label htmlFor="inputId">` with matching input `id`
- Or use `aria-label` for programmatic labels

```tsx
// ❌ Bad: No label
<input type="text" placeholder="Search" />

// ✅ Good: Proper label
<label htmlFor="search">Search</label>
<input id="search" type="text" />
```

### Issue: "Buttons must have accessible names"

**Solution**:
- Provide text content or `aria-label` for buttons
- Mark icons as `aria-hidden="true"`

```tsx
// ❌ Bad: No accessible name
<button><CloseIcon /></button>

// ✅ Good: aria-label provided
<button aria-label="Close dialog">
  <CloseIcon aria-hidden="true" />
</button>
```

### Issue: "Landmark must have unique aria-label"

**Solution**:
- Add unique `aria-label` to multiple landmarks of the same type

```tsx
// ❌ Bad: Multiple navs without labels
<nav>...</nav>
<nav>...</nav>

// ✅ Good: Unique labels
<nav aria-label="Main navigation">...</nav>
<nav aria-label="Breadcrumb navigation">...</nav>
```

### Issue: "Focus not visible on interactive elements"

**Solution**:
- Ensure `focus-visible` styles are applied
- Use Tailwind's `focus-visible:` variant

```tsx
// ✅ Good: Visible focus indicator
<button className="focus-visible:ring-2 focus-visible:ring-primary">
  Submit
</button>
```

---

## Developer Quick Reference

### Before Committing

```bash
# Run accessibility tests
pnpm test:accessibility

# Run E2E tests
pnpm e2e -- accessibility.spec.ts

# Check for violations in browser
# Open DevTools → Lighthouse → Run accessibility audit
```

### During Code Review

- [ ] Check for semantic HTML usage
- [ ] Verify ARIA attributes are correct
- [ ] Ensure keyboard navigation works
- [ ] Review focus management
- [ ] Confirm automated tests are added

### When Adding New Features

1. **Design Phase**: Consider accessibility requirements
2. **Development**: Use semantic HTML and proper ARIA
3. **Testing**: Write automated accessibility tests
4. **Review**: Manual testing with keyboard and screen reader
5. **Documentation**: Update this guide if new patterns emerge

---

## Accessibility Utilities

The platform provides reusable accessibility utilities:

### Hooks

- `useAnnouncer()`: Announce messages to screen readers
- `useFocusTrap()`: Trap focus within modals/dialogs
- `useReducedMotion()`: Detect prefers-reduced-motion preference
- `useKeyboardShortcuts()`: Register keyboard shortcuts

### Utilities

- `announce(message, priority)`: Announce to screen readers
- `getFocusableElements(container)`: Get focusable elements
- `saveFocus()` / `restoreFocus()`: Manage focus state
- `meetsContrastStandard(ratio, level)`: Check contrast compliance

**Example Usage**:

```tsx
import { useAnnouncer } from '@/hooks/useAnnouncer'

function MyComponent() {
  const { announce } = useAnnouncer()

  const handleSave = async () => {
    await saveData()
    announce('Data saved successfully', 'polite')
  }

  return <button onClick={handleSave}>Save</button>
}
```

---

## Questions or Issues?

- **Slack**: #accessibility channel
- **Email**: accessibility@intelgraph.com
- **Documentation**: This file + `/docs/modules/ui_accessibility_wcag_aaa.md`

---

**Remember**: Accessibility is not a feature—it's a fundamental requirement. Build it in from the start! 🎯
