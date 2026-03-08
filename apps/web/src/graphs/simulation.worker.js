"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const d3_force_1 = require("d3-force");
let simulation; // Type: Simulation<WorkerNode, WorkerLink>
self.onmessage = (event) => {
    const { type, nodes, links, width, height, layoutType, nodeId, x, y } = event.data;
    switch (type) {
        case 'init':
            if (simulation)
                simulation.stop();
            if (!nodes || !links || !width || !height)
                return;
            // Create simulation
            switch (layoutType) {
                case 'force':
                    simulation = (0, d3_force_1.forceSimulation)(nodes)
                        .force('link', (0, d3_force_1.forceLink)(links).id((d) => d.id).distance(100))
                        .force('charge', (0, d3_force_1.forceManyBody)().strength(-300))
                        .force('center', (0, d3_force_1.forceCenter)(width / 2, height / 2))
                        .force('collision', (0, d3_force_1.forceCollide)().radius(30));
                    break;
                case 'radial':
                    simulation = (0, d3_force_1.forceSimulation)(nodes)
                        .force('link', (0, d3_force_1.forceLink)(links).id((d) => d.id).distance(80))
                        .force('charge', (0, d3_force_1.forceManyBody)().strength(-200))
                        .force('radial', (0, d3_force_1.forceRadial)(150, width / 2, height / 2));
                    break;
                case 'hierarchic':
                    simulation = (0, d3_force_1.forceSimulation)(nodes)
                        .force('link', (0, d3_force_1.forceLink)(links).id((d) => d.id).distance(60))
                        .force('charge', (0, d3_force_1.forceManyBody)().strength(-100))
                        .force('y', (0, d3_force_1.forceY)().y(d => (d.index || 0) * 80 + 100))
                        .force('x', (0, d3_force_1.forceX)(width / 2));
                    break;
                default:
                    simulation = (0, d3_force_1.forceSimulation)(nodes)
                        .force('link', (0, d3_force_1.forceLink)(links).id((d) => d.id))
                        .force('charge', (0, d3_force_1.forceManyBody)())
                        .force('center', (0, d3_force_1.forceCenter)(width / 2, height / 2));
            }
            simulation.on('tick', () => {
                // Send positions back to main thread
                // We only need to send id, x, y to minimize data transfer
                const simplifiedNodes = nodes.map(n => ({ id: n.id, x: n.x, y: n.y }));
                self.postMessage({ type: 'tick', nodes: simplifiedNodes });
            });
            break;
        case 'drag':
            if (!simulation || !nodeId)
                return;
            const node = simulation.nodes().find((n) => n.id === nodeId);
            if (node) {
                node.fx = x;
                node.fy = y;
                simulation.alphaTarget(0.3).restart();
            }
            break;
        case 'stop':
            if (simulation)
                simulation.stop();
            break;
    }
};
