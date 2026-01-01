# IntelGraph Platform Integration Tests

This directory contains comprehensive integration tests for the Summit/IntelGraph platform, covering the UI/UX improvements, design system components, and interactions between key components.

## Test Files

### 1. intelgraph-integration.spec.ts
- Tests the main IntelGraph interface loading with all components
- Verifies drag-and-drop functionality between EvidenceBoard and GraphCanvas
- Tests responsive layout across different screen sizes
- Validates accessibility compliance across all components
- Tests error state handling
- Ensures state consistency across components
- Tests collaborative features
- Verifies performance under load
- Confirms design system consistency
- Tests data persistence

### 2. intelgraph-component-interaction.spec.ts
- Tests evidence filtering and graph synchronization
- Verifies workspace layout persistence across sessions
- Tests graph canvas interactions with evidence board
- Ensures consistent state maintenance between components
- Tests concurrent user interactions
- Validates performance with complex evidence relationships
- Handles edge cases and boundary conditions

### 3. intelgraph-accessibility-responsive.spec.ts
- Tests accessibility compliance on desktop, tablet, and mobile
- Verifies responsive layout across screen sizes
- Tests keyboard navigation throughout the application
- Validates focus management during component interactions
- Ensures proper screen reader support
- Tests accessibility during responsive transitions
- Verifies touch interactions on mobile devices
- Tests high contrast mode compatibility
- Supports reduced motion preferences
- Maintains accessibility during error states

### 4. intelgraph-error-handling.spec.ts
- Handles network errors gracefully
- Manages timeout errors
- Validates input handling for invalid data
- Tests component loading states
- Handles browser storage limits
- Manages graph rendering errors
- Handles concurrent operations safely
- Tests for memory leaks during extended use
- Handles unsupported browser features
- Manages unexpected component state changes

## Test Coverage

These integration tests provide comprehensive coverage of:

- **UI/UX Improvements**: All major UI components and their interactions
- **Design System Components**: Consistency and proper implementation of design system
- **GraphCanvas Component**: Visualization, interaction, and performance
- **EvidenceBoard Component**: Kanban-style organization and filtering
- **AnalysisWorkspace Component**: Layout management and collaboration features
- **Accessibility**: WCAG compliance across all components and screen sizes
- **Responsive Design**: Proper behavior on desktop, tablet, and mobile
- **Error Handling**: Graceful degradation and user feedback during errors
- **Performance**: Handling of large datasets and complex interactions
- **State Management**: Consistency across components and sessions
- **Collaboration**: Multi-user scenarios and shared workspaces

## Running the Tests

To run these tests, use the Playwright test runner:

```bash
npx playwright test e2e/ui/intelgraph-*.spec.ts
```

Or to run all IntelGraph integration tests:

```bash
npx playwright test e2e/ui/
```

To run with UI mode for debugging:

```bash
npx playwright test --ui e2e/ui/intelgraph-integration.spec.ts
```

## Expected Results

All tests should pass, confirming that:
- All components work together seamlessly
- The design system is properly implemented
- Accessibility standards are met
- Responsive design works correctly
- Error handling is robust
- Performance is acceptable under load
- State management is consistent
- Collaboration features work properly