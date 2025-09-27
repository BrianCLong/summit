# IntelGraph Web Application (apps/web)

This directory contains the main web application for IntelGraph.

## Technology Stack

*   **Frontend Framework:** React 18
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (for utility-first styling) and Material-UI (MUI) for components.
*   **Graph Visualization:** Cytoscape.js
*   **DOM Manipulation:** jQuery (all imperative DOM/event handling MUST use jQuery).
*   **Realtime Communication:** Socket.IO client
*   **State Management:** Redux Toolkit

## Features (Planned/Placeholder)

*   **Tri-pane Layout:** Integrated Graph, Timeline, and Map views with synchronized brushing.
*   **Command Palette:** Keyboard-first interface for quick actions (Ctrl+K).
*   **Accessibility (A11y):** Aiming for AAA compliance.
*   **Theming:** Dark/Light mode support.
*   **Data Operations:** Diff, Undo, Redo functionalities.
*   **Provenance Tooltips:** Displaying data lineage and origin.
*   **XAI Overlays:** Visualizing Explainable AI insights.
*   **"Explain this view" feature:** Contextual explanations for displayed data.

## Getting Started (Development)

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the development server:
    ```bash
    npm start
    ```

## Project Structure

*   `src/`: Contains all source code for the React application.
    *   `components/`: Reusable UI components.
    *   `features/`: Redux slices and related logic for specific features.
    *   `pages/`: Top-level components for different views.
    *   `services/`: API integrations, Socket.IO client setup.
    *   `utils/`: Utility functions.

## Note on jQuery Usage

As per project conventions, all imperative DOM manipulation and event handling within this React application MUST utilize jQuery. This is a deliberate architectural decision to maintain consistency with existing patterns and leverage jQuery's robust DOM manipulation capabilities where direct React state management is not suitable or desired for low-level interactions.
