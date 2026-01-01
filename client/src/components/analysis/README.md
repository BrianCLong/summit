# Analysis Components

This directory contains components related to intelligence analysis and investigation workflows.

## Components

### AnalysisWorkspace
A flexible, collaborative workspace for analysts to arrange multiple components side-by-side, save and restore workspace layouts, collaborate with other analysts in real-time, and link related findings and evidence.

Key features:
- Flexible layout system with grid, flex, and free-form arrangements
- Real-time collaboration with multiple analysts
- Component linking to show relationships between data
- Save/load functionality for workspace layouts
- Responsive and accessible design
- Integration with the Summit/IntelGraph design system

## Usage

```jsx
import { AnalysisWorkspace } from './components/analysis';

function App() {
  return (
    <AnalysisWorkspace
      userId="user-123"
      userName="John Doe"
      userEmail="john@example.com"
      onWorkspaceChange={handleWorkspaceChange}
    />
  );
}
```

For more detailed usage instructions, see the individual component documentation files.