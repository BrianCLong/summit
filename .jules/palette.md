## YYYY-MM-DD - AI Assistant Component A11y
**Learning:** Found several icon-only buttons in the new Maestro AIAssistant component that were completely missing ARIA labels, making them invisible to screen readers. This is a common pattern in new React components that rely heavily on Heroicons without accompanying text.
**Action:** Always verify that buttons containing only SVGs or Heroicons have descriptive `aria-label` attributes to ensure they are accessible to users relying on assistive technologies.
