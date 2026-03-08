"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_1 = require("react-dom/test-utils");
const client_1 = require("react-dom/client");
const vitest_1 = require("vitest");
const node_perf_hooks_1 = require("node:perf_hooks");
const index_js_1 = require("../src/index.js");
const graph_js_1 = require("./fixtures/graph.js");
(0, vitest_1.describe)('ProgressiveGraph benchmark', () => {
    (0, vitest_1.it)('renders a dense fixture within the upper render budget', async () => {
        const { nodes, edges } = (0, graph_js_1.buildFixtureGraph)(1800, 45, 4);
        const container = document.createElement('div');
        const root = (0, client_1.createRoot)(container);
        let renderDuration = 0;
        await (0, test_utils_1.act)(async () => {
            const start = node_perf_hooks_1.performance.now();
            await new Promise((resolve) => {
                root.render(<index_js_1.ProgressiveGraph nodes={nodes} edges={edges} initialBatchSize={96} frameBudgetMs={10} onRenderComplete={(elapsed) => {
                        renderDuration = elapsed;
                        resolve();
                    }}/>);
            });
            renderDuration = renderDuration || node_perf_hooks_1.performance.now() - start;
        });
        const renderedCount = Number(container
            .querySelector('[data-rendered-count]')
            ?.getAttribute('data-rendered-count'));
        const region = container.querySelector('[role="region"]');
        const busy = region?.getAttribute('aria-busy');
        const visibleCount = Number(region?.getAttribute('data-visible-count') ?? '0');
        const elidedCount = Number(region?.getAttribute('data-elided-count') ?? '0');
        const lod = region?.getAttribute('data-lod');
        (0, vitest_1.expect)(renderDuration).toBeGreaterThan(0);
        (0, vitest_1.expect)(renderDuration).toBeLessThan(140);
        (0, vitest_1.expect)(renderedCount).toBe(nodes.length);
        (0, vitest_1.expect)(busy === null || busy === 'false').toBe(true);
        (0, vitest_1.expect)(lod).toBe('compact');
        (0, vitest_1.expect)(visibleCount).toBeGreaterThan(0);
        (0, vitest_1.expect)(visibleCount).toBeLessThan(nodes.length);
        (0, vitest_1.expect)(elidedCount).toBe(nodes.length - visibleCount);
    });
    (0, vitest_1.it)('streams large batches without regressing rendered progress', async () => {
        const initial = (0, graph_js_1.buildFixtureGraph)(900, 40, 2);
        const expanded = (0, graph_js_1.buildFixtureGraph)(1600, 40, 3);
        const container = document.createElement('div');
        const root = (0, client_1.createRoot)(container);
        await (0, test_utils_1.act)(async () => {
            root.render(<index_js_1.ProgressiveGraph streaming nodes={initial.nodes} edges={initial.edges} initialBatchSize={72} frameBudgetMs={10}/>);
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        const firstRendered = Number(container
            .querySelector('[data-rendered-count]')
            ?.getAttribute('data-rendered-count'));
        await (0, test_utils_1.act)(async () => {
            root.render(<index_js_1.ProgressiveGraph streaming nodes={expanded.nodes} edges={expanded.edges} initialBatchSize={72} frameBudgetMs={10}/>);
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        const region = container.querySelector('[role="region"]');
        const secondRendered = Number(container
            .querySelector('[data-rendered-count]')
            ?.getAttribute('data-rendered-count') ?? '0');
        const visibleCount = Number(region?.getAttribute('data-visible-count') ?? '0');
        (0, vitest_1.expect)(secondRendered).toBeGreaterThanOrEqual(firstRendered);
        (0, vitest_1.expect)(visibleCount).toBeGreaterThan(0);
    });
});
