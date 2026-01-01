# AnalysisWorkspace Component

The AnalysisWorkspace component is a flexible, collaborative workspace for analysts to arrange multiple components side-by-side, save and restore workspace layouts, collaborate with other analysts in real-time, and link related findings and evidence.

## Features

### Component Arrangement
- **Flexible Layouts**: Supports grid, flex, and free-form layouts for arranging components
- **Drag and Drop**: Move components around the workspace (in free-form layout)
- **Resizing**: Resize components to fit your analysis needs
- **Search**: Quickly find components by name or type

### Workspace Management
- **Save/Load**: Save current workspace layouts and load them later
- **Versioning**: Track changes to workspace layouts over time
- **Tags**: Organize workspaces with custom tags
- **History**: Access recently used workspaces

### Collaboration
- **Real-time**: Multiple analysts can work on the same workspace simultaneously
- **Presence**: See who else is currently in the workspace
- **Cursor Tracking**: Visualize where other analysts are working
- **Sharing**: Share workspaces with other analysts

### Linking and Relationships
- **Component Linking**: Connect related components to show relationships
- **Evidence Linking**: Link evidence and findings to show connections
- **Relationship Types**: Support for different types of relationships (evidence, finding, relationship, timeline)

### Accessibility and Responsiveness
- **Keyboard Navigation**: Full keyboard support for accessibility
- **Responsive Design**: Works on different screen sizes
- **Screen Reader Support**: Proper ARIA labels and roles
- **High Contrast Mode**: Support for users with visual impairments

## Props

| Prop | Type | Description |
|------|------|-------------|
| userId | string | The ID of the current user |
| userName | string | The name of the current user |
| userEmail | string | The email of the current user |
| onWorkspaceChange | (workspace: WorkspaceLayout) => void | Callback when workspace changes |
| initialWorkspace | WorkspaceLayout | Optional initial workspace to load |
| className | string | Additional CSS classes |

## Usage

```jsx
import AnalysisWorkspace from './components/analysis/AnalysisWorkspace';

function App() {
  const handleWorkspaceChange = (workspace) => {
    // Handle workspace changes, e.g., save to backend
    console.log('Workspace updated:', workspace);
  };

  return (
    <AnalysisWorkspace
      userId="user-123"
      userName="John Doe"
      userEmail="john@example.com"
      onWorkspaceChange={handleWorkspaceChange}
      initialWorkspace={savedWorkspace}
    />
  );
}
```

## Keyboard Shortcuts

- `Ctrl+S`: Save current workspace
- `Ctrl+O`: Open/load workspace
- `Ctrl+N`: Create new workspace
- `Ctrl+Z`: Undo last action
- `Ctrl+Y`: Redo last action
- `Delete`: Delete selected component
- `Ctrl+D`: Duplicate selected component

## Theming

The component integrates with the Summit/IntelGraph design system and supports both light and dark themes. The theme can be customized by providing a custom theme object.

## Performance Considerations

- Large numbers of components may impact performance
- Use virtualization for large datasets within components
- Implement lazy loading for external data sources
- Optimize rendering of linked components

## Security Considerations

- All data sharing is controlled through user permissions
- Workspaces can be set as private or shared
- Real-time collaboration uses secure WebSocket connections
- Sensitive data should be encrypted at rest and in transit