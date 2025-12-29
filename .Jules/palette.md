## 2024-05-23 - Hover-only controls are inaccessible
**Learning:** The 'Copy' button was hidden by default (`opacity-0`) and only revealed on `group-hover`. This pattern is problematic for touch users and reduces feature discoverability.
**Action:** Use 'always visible' controls for primary actions. In this case, making it always visible but subtle is a better compromise.
