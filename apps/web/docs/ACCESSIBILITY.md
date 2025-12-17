# Accessibility Guidelines

This document outlines the accessibility standards and testing procedures for the IntelGraph frontend (`apps/web`). We target **WCAG 2.1 Level AA** compliance.

## Standards

1.  **Semantic HTML**: Use correct HTML elements (e.g., `<nav>`, `<main>`, `<button>`) instead of generic `div`s.
2.  **Keyboard Navigation**: Ensure all interactive elements are focusable and usable with a keyboard.
    *   Tab order should follow the visual layout.
    *   Focus indicators must be visible.
    *   A "Skip to Content" link is available for screen reader and keyboard users.
3.  **Color Contrast**:
    *   Text and interactive elements must have a contrast ratio of at least **4.5:1**.
    *   We use a modified Tailwind color palette in `index.css` to ensure `muted-foreground` passes this check.
4.  **Screen Readers**:
    *   All images must have `alt` text.
    *   Icon-only buttons must have `aria-label`.
    *   Interactive controls must have appropriate ARIA roles and states (e.g., `aria-expanded`).

## Component Guidelines

### Navigation
- The main navigation uses semantic `<nav>` and list structures.
- Links indicate the current page using `aria-current="page"` or visual cues compatible with screen readers.
- Icon-only buttons (like "Sign Out") have explicit `aria-label` attributes.

### Forms
- All inputs must have associated labels (either via `<label htmlFor="...">` or `aria-label`).
- Error messages are associated with inputs using `aria-describedby`.

### Skip Link
- A hidden "Skip to main content" link is the first focusable element on the page, allowing users to bypass the navigation menu.

## Testing

We use **Vitest** with **axe-core** (`vitest-axe`) for automated accessibility testing.

### Running Tests

To run the accessibility tests:

```bash
cd apps/web
npm test tests/accessibility.test.tsx
```

### Adding New Tests

When creating new components or pages, add accessibility checks using the `axe` matcher:

```tsx
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'

it('should have no violations', async () => {
  const { container } = render(<MyComponent />)
  expect(await axe(container)).toHaveNoViolations()
})
```

## Manual Verification Checklist

- [ ] Tab through the page: Can you reach all interactive elements? Is the focus visible?
- [ ] Use a screen reader (e.g., NVDA, VoiceOver): Does the content make sense? Are images described?
- [ ] Zoom to 200%: Is the content still readable and functional?
- [ ] Check color contrast using a tool like WebAIM Contrast Checker or Axe DevTools.
