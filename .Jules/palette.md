## 2025-10-27 - Icon Button Loading States
**Learning:** Icon-only buttons (`size="icon"`) break layout when a loading spinner is prepended, as the fixed width (`w-10`) cannot accommodate both spinner and icon.
**Action:** For icon buttons, replace the icon with the spinner during loading state, while wrapping the original content in `sr-only` to preserve accessibility labels (especially if they are embedded in children). Added `aria-busy` for better screen reader feedback.
