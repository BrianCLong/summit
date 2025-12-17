# Help Overlay

In-product contextual help components for IntelGraph platform.

## Installation

```bash
pnpm add @intelgraph/help-overlay
```

## Usage

### Setup Provider

Wrap your app with `HelpProvider`:

```tsx
import { HelpProvider } from '@intelgraph/help-overlay';

function App() {
  return (
    <HelpProvider config={{
      baseUrl: '/api/v1/kb',
      defaultRole: 'analyst',
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
    }}>
      <YourApp />
    </HelpProvider>
  );
}
```

### Add Help Sidebar

```tsx
import { HelpSidebar } from '@intelgraph/help-overlay';

function Layout({ children }) {
  return (
    <div>
      {children}
      <HelpSidebar />
    </div>
  );
}
```

### Add Help Buttons

```tsx
import { HelpButton } from '@intelgraph/help-overlay';

function EntityPanel() {
  return (
    <div>
      <h2>Entities <HelpButton anchorKey="entity-panel" /></h2>
      {/* ... */}
    </div>
  );
}
```

### Add Help Tooltips

```tsx
import { HelpTooltip } from '@intelgraph/help-overlay';

function Form() {
  return (
    <label>
      <HelpTooltip anchorKey="classification-field" placement="right">
        Classification
      </HelpTooltip>
      <select>{/* ... */}</select>
    </label>
  );
}
```

### Use Help Hook

```tsx
import { useHelp } from '@intelgraph/help-overlay';

function CustomHelpTrigger() {
  const { openHelp, search, searchResults } = useHelp();

  return (
    <button onClick={() => openHelp()}>
      Need help?
    </button>
  );
}
```

## Components

### HelpProvider
Context provider for help state management.

Props:
- `config.baseUrl` - KB service API base URL
- `config.defaultRole` - Default user role for filtering
- `config.cacheTimeout` - Cache duration in ms (default: 5 min)

### HelpSidebar
Slide-out panel displaying help content.

Props:
- `className` - Custom CSS class
- `onClose` - Callback when closed

### HelpButton
Trigger button for opening help.

Props:
- `anchorKey` - Optional anchor to load specific help
- `className` - Custom CSS class
- `children` - Custom button content

### HelpSearch
Search input component.

Props:
- `placeholder` - Input placeholder text
- `className` - Custom CSS class
- `onResultSelect` - Callback when result selected

### HelpTooltip
Inline help tooltip on hover.

Props:
- `anchorKey` - Anchor key for help content
- `children` - Element to wrap
- `placement` - Tooltip position (top/bottom/left/right)

### HelpArticleView
Article display component.

Props:
- `article` - Article object to display
- `onBack` - Callback for back button

## Keyboard Shortcuts

- `?` - Toggle help sidebar
- `Escape` - Close help sidebar

## Styling

Components use inline styles by default. Pass `className` prop to use your own CSS:

```tsx
<HelpSidebar className="my-sidebar" />
```

```css
.my-sidebar {
  width: 500px;
  background: #f0f0f0;
}
```

## TypeScript

Full TypeScript support with exported types:

```tsx
import type {
  HelpArticle,
  HelpAnchor,
  HelpContextValue,
  HelpProviderConfig,
} from '@intelgraph/help-overlay';
```
