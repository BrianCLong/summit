# Tri-Pane Analyst UX

Synchronized Graph + Timeline + Map panes with "Explain this View" panel.

## Features
- ✅ Synchronized brush/filters across panes
- ✅ Explain panel: lineage, policy visibility, topology metrics
- ✅ "What changed?" diff between saved views
- ✅ Accessibility checks, keyboard-first navigation

## Usage
```tsx
import { TriPaneLayout } from '@intelgraph/tri-pane-ux';
import React from 'react';
import ReactDOM from 'react-dom/client';

ReactDOM.createRoot(document.getElementById('root')!).render(<TriPaneLayout />);
```
