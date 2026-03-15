## 2024-05-19 - Added ARIA attributes to NarrativeControls
**Learning:** React labels without `htmlFor` matching input `id` fail basic accessibility checks, particularly for screen readers interacting with checkboxes. Found this pattern in `NarrativeControls.tsx`.
**Action:** When adding form controls or toggles in this app's components, always explicitly link the label and input using `htmlFor` and `id`.
