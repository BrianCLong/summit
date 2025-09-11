---
name: 'Issue #1: Graph Rendering Lag on Large Datasets'
about: Optimize Cytoscape.js rendering for large graphs
title: 'Issue #1: Graph Rendering Lag on Large Datasets'
labels: 'bug, performance, frontend'
assignees: ''
---

**Branch**: `feature/graph-render-optim`

**Status**: Open

**Description**
When visualizing graphs with over 10,000 nodes and 20,000 edges, the Cytoscape.js-based UI becomes sluggish. Frame rates drop significantly, and layout calculations often block the main thread, leading to a poor user experience, especially on lower-spec hardware. This issue impacts the usability of IntelGraph for large-scale investigations and data exploration.

**Proposed Solution**
Implement strategies for incremental rendering, offloading layout computations to web workers, and optimizing Cytoscape.js configurations for large datasets.

**Code/File Layout**

```
frontend/
  graph/
    cytoscape-config.js
    layout-worker.js
    render-optim.js
tests/
  e2e/
    large-graph-perf.test.js
```

**jQuery/JS Stub (`render-optim.js`):**

```js
// frontend/graph/render-optim.js
import { runLayoutInWorker } from './layout-worker.js';

function initializeOptimizedGraph(containerId, elements) {
  const cy = cytoscape({
    container: document.getElementById(containerId),
    elements: elements,
    // Initial minimal config
    layout: { name: 'preset' },
    style: [
      /* ... your existing styles ... */
    ],
    // Further optimizations
    pixelRatio: 'auto',
    textureOnViewport: true,
    wheelSensitivity: 0.1,
    motionBlur: true,
    hideEdgesOnViewport: true,
    hideLabelsOnViewport: true,
  });

  // Offload complex layout to a web worker
  runLayoutInWorker(cy, elements).then((positions) => {
    cy.nodes().forEach((node) => {
      if (positions[node.id()]) {
        node.position(positions[node.id()]);
      }
    });
    cy.fit(); // Fit after layout
  });

  return cy;
}

// In cytoscape-config.js or main app init
// const cyInstance = initializeOptimizedGraph('graph-container', graphData);
```

**JavaScript Stub (`layout-worker.js`):**

```js
// frontend/graph/layout-worker.js
// This file would typically be a separate worker script loaded via new Worker()
// For demonstration, showing the core logic that would run in the worker.

// In a real web worker file (e.g., layout.worker.js):
// self.onmessage = function(e) {
//     const { elements, layoutOptions } = e.data;
//     // Simulate layout computation
//     const positions = {};
//     // Placeholder for actual layout algorithm (e.g., cola, cose-bilkent)
//     // This would involve running the layout algorithm on the elements
//     // and returning their final positions.
//     elements.nodes.forEach(node => {
//         positions[node.data.id] = { x: Math.random() * 1000, y: Math.random() * 1000 };
//     });
//     self.postMessage(positions);
// };

export function runLayoutInWorker(cy, elements) {
  return new Promise((resolve, reject) => {
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported. Running layout on main thread.');
      // Fallback to main thread layout if workers not supported
      cy.layout({ name: 'cose', animate: true }).run();
      const positions = {};
      cy.nodes().forEach((node) => (positions[node.id()] = node.position()));
      resolve(positions);
      return;
    }

    const worker = new Worker('./layout.worker.js'); // Path to your actual worker file
    worker.postMessage({ elements: elements, layoutOptions: { name: 'cose' } }); // Example layout

    worker.onmessage = function (e) {
      resolve(e.data);
      worker.terminate();
    };

    worker.onerror = function (e) {
      console.error('Web Worker error:', e);
      reject(e);
    };
  });
}
```

**Architecture Sketch (ASCII)**

```
+-------------------+       +---------------------+
|  Main UI Thread   |       |  Web Worker Thread  |
| (Cytoscape.js)    |       | (Layout Computation)|
+-------------------+       +---------------------+
        |                             ^
        | Request Layout              | Layout Results
        | (postMessage)               | (postMessage)
        v                             |
+-------------------+       +---------------------+
|  render-optim.js  |------>|   layout-worker.js  |
| (Manages rendering|       | (Runs layout algo   |
|  & worker comms)  |<------|  off-main thread)   |
+-------------------+       +---------------------+
        ^
        | Updates Node Positions
        |
+-------------------+
|  Graph Container  |
|  (DOM Element)    |
+-------------------+
```

**Sub-tasks:**

- [ ] Research and select an appropriate Cytoscape.js layout algorithm suitable for large graphs (e.g., `cose-bilkent`, `cola`).
- [ ] Implement a dedicated Web Worker for offloading layout computations.
- [ ] Integrate the Web Worker with the Cytoscape.js instance to apply computed positions.
- [ ] Optimize Cytoscape.js rendering settings (e.g., `pixelRatio`, `textureOnViewport`, `motionBlur`, `hideEdgesOnViewport`, `hideLabelsOnViewport`).
- [ ] Implement a mechanism to progressively render nodes/edges if initial load is still too heavy.
- [ ] Develop end-to-end performance tests to measure frame rates and layout times on large datasets.
