# EvidenceBoard Component

The EvidenceBoard is a Kanban-style board component designed for organizing evidence and findings in the IntelGraph platform. It provides a drag-and-drop interface for managing evidence through different stages of analysis.

## Features

- **Drag-and-Drop Interface**: Move evidence cards between columns using drag-and-drop functionality
- **Multiple Columns**: Organize evidence into different stages of analysis (e.g., New Evidence, In Analysis, Verified, Rejected)
- **Tagging System**: Apply custom tags to evidence items for better categorization
- **Filtering**: Search and filter evidence by tags, priority, status, and other criteria
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Full keyboard navigation and screen reader support
- **Customizable**: Configure columns, tags, and initial data

## Props

| Prop | Type | Description |
|------|------|-------------|
| `initialColumns?` | `EvidenceColumn[]` | Initial column configuration |
| `initialItems?` | `EvidenceItem[]` | Initial evidence items |
| `initialTags?` | `EvidenceTag[]` | Initial tags |
| `onItemsChange?` | `(items: EvidenceItem[]) => void` | Callback when items change |
| `onColumnsChange?` | `(columns: EvidenceColumn[]) => void` | Callback when columns change |
| `onTagsChange?` | `(tags: EvidenceTag[]) => void` | Callback when tags change |
| `className?` | `string` | Additional CSS class |
| `style?` | `React.CSSProperties` | Additional inline styles |

## Types

### EvidenceItem

```typescript
interface EvidenceItem {
  id: string;
  title: string;
  description: string;
  tags: string[]; // IDs of tags
  columnId: string;
  createdAt: Date;
  updatedAt: Date;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  source?: string;
  confidence?: number; // 0-100
  status?: string;
}
```

### EvidenceColumn

```typescript
interface EvidenceColumn {
  id: string;
  title: string;
  description: string;
  itemCount: number;
  color: string;
}
```

### EvidenceTag

```typescript
interface EvidenceTag {
  id: string;
  name: string;
  color: string;
}
```

## Usage

```jsx
import { EvidenceBoard } from './path/to/EvidenceBoard';
import { AccessibilityProvider } from './path/to/AccessibilityContext';

function App() {
  return (
    <AccessibilityProvider>
      <EvidenceBoard
        initialColumns={[
          { id: 'new', title: 'New Evidence', description: 'Recently discovered items', itemCount: 0, color: '#667eea' },
          { id: 'analyzing', title: 'In Analysis', description: 'Currently being examined', itemCount: 0, color: '#667eea' },
          { id: 'verified', title: 'Verified', description: 'Confirmed and validated', itemCount: 0, color: '#28a745' },
          { id: 'rejected', title: 'Rejected', description: 'Discredited or invalid', itemCount: 0, color: '#dc3545' },
        ]}
        initialItems={[
          {
            id: '1',
            title: 'Document Analysis',
            description: 'Analysis of the suspicious document found at the scene',
            tags: ['document', 'physical'],
            columnId: 'analyzing',
            createdAt: new Date(),
            updatedAt: new Date(),
            priority: 'high',
            source: 'Field Agent #123',
            confidence: 85,
            status: 'pending',
          }
        ]}
        initialTags={[
          { id: 'source', name: 'Source', color: '#667eea' },
          { id: 'document', name: 'Document', color: '#17a2b8' },
          { id: 'testimony', name: 'Testimony', color: '#ffc107' },
        ]}
        onItemsChange={(items) => console.log('Items changed:', items)}
      />
    </AccessibilityProvider>
  );
}
```

## Keyboard Navigation

The EvidenceBoard supports full keyboard navigation:

- Tab to navigate between interactive elements
- Arrow keys to move between items in lists
- Enter or Space to activate buttons and open menus
- Escape to close menus and dialogs

## Accessibility

The component follows WCAG 2.1 guidelines:

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Reduced motion support

## Styling

The EvidenceBoard uses the IntelGraph design system and can be customized through:

- CSS variables defined in the design tokens
- Standard Material-UI theme customization
- Custom class names and inline styles