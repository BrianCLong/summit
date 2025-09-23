IntelGraph UI — Quick Start

Prereqs
- Node >= 18.18
- Repo bootstrapped (root): npm install && (cd server && npm install) && (cd client && npm install)

Dev
- UI dev server: npm -w client run dev
- Codegen (persisted ops): npm -w client run persist:queries (after adding .graphql docs)

Tests
- Unit (client): npm -w client run test
- E2E (Playwright): npm -w client run e2e
- A11y smoke (axe): npm -w client run a11y:smoke

Build
- npm -w client run build

Notes
- ESM/NodeNext everywhere. Keep relative imports with .js in source.
- Apollo ops should be generated/persisted; components use wrappers (useSafeQuery) until codegen is wired.
- Graph Workbench relies on Cytoscape.js and jQuery for DOM interactions (context menu, lasso).

Screenshots (placeholders)
- docs/screenshots/dashboard.png
- docs/screenshots/graph.png
- docs/screenshots/investigation-export.png

