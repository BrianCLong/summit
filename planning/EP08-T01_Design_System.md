# EP08-T01 Design Tokens & Theme

## Foundation
*   **Framework**: Material UI (MUI) v5 + Joy UI (experimental).
*   **Styling**: Emotion (CSS-in-JS).
*   **Icons**: Phosphor Icons (for consistency).

## Color Palette (Dark Mode Default)

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `primary.main` | `#0066FF` | Key actions, links. |
| `background.default` | `#09090B` | App background. |
| `background.paper` | `#18181B` | Cards, panels. |
| `text.primary` | `#FAFAFA` | Main content. |
| `text.secondary` | `#A1A1AA` | Metadata, hints. |
| `error.main` | `#EF4444` | Critical alerts. |
| `success.main` | `#10B981` | Success states. |
| `warning.main` | `#F59E0B` | Warnings. |

## Typography
*   **Font Family**: `Inter`, system-ui, sans-serif.
*   **Mono**: `JetBrains Mono`, monospace.

## Accessibility (A11y)
*   **Contrast**: All text must meet WCAG AA (4.5:1).
*   **Focus**: Visible focus rings on all interactive elements.
*   **Screen Readers**: Semantic HTML, ARIA labels where needed.

## Component Library
Located in `apps/web/src/components/design-system`.
*   Buttons (Primary, Secondary, Ghost)
*   Inputs (Text, Select, Date)
*   Cards (Data display)
*   Tables (Data grids with sorting/filtering)
