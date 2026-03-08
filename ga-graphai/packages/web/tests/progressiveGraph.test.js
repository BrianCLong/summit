"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_1 = require("react-dom/test-utils");
const client_1 = require("react-dom/client");
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const graph_js_1 = require("./fixtures/graph.js");
(0, vitest_1.describe)('ProgressiveGraph', () => {
    (0, vitest_1.it)('progressively reveals batches while keeping hover/select responsive', async () => {
        const { nodes, edges } = (0, graph_js_1.buildFixtureGraph)(180);
        const onHover = vitest_1.vi.fn();
        const onSelect = vitest_1.vi.fn();
        const container = document.createElement('div');
        const root = (0, client_1.createRoot)(container);
        await (0, test_utils_1.act)(async () => {
            root.render(<index_js_1.ProgressiveGraph nodes={nodes} edges={edges} initialBatchSize={24} onHoverNode={onHover} onSelectNode={onSelect}/>);
            await Promise.resolve();
        });
        const region = container.querySelector('[role="region"]');
        (0, vitest_1.expect)(region?.getAttribute('aria-busy')).toBe('true');
        const renderedBatch = container.querySelectorAll('[data-node-id]').length;
        (0, vitest_1.expect)(renderedBatch).toBeGreaterThanOrEqual(24);
        (0, vitest_1.expect)(renderedBatch).toBeLessThan(nodes.length);
        const firstNode = container.querySelector('[data-node-id="node-0"]');
        (0, vitest_1.expect)(firstNode).toBeTruthy();
        await (0, test_utils_1.act)(async () => {
            firstNode?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        });
        (0, vitest_1.expect)(onHover).toHaveBeenCalledWith('node-0');
        await (0, test_utils_1.act)(async () => {
            firstNode?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        });
        (0, vitest_1.expect)(onSelect).toHaveBeenCalledWith('node-0');
    });
    (0, vitest_1.it)('keeps hover/select responsive while rendering remains busy', async () => {
        const { nodes, edges } = (0, graph_js_1.buildFixtureGraph)(320);
        const onHover = vitest_1.vi.fn();
        const onSelect = vitest_1.vi.fn();
        const container = document.createElement('div');
        const root = (0, client_1.createRoot)(container);
        await (0, test_utils_1.act)(async () => {
            root.render(<index_js_1.ProgressiveGraph nodes={nodes} edges={edges} initialBatchSize={12} frameBudgetMs={6} onHoverNode={onHover} onSelectNode={onSelect}/>);
            await Promise.resolve();
        });
        const renderSurface = container.querySelector('[data-rendered-count]');
        const renderedCount = Number(renderSurface?.getAttribute('data-rendered-count'));
        (0, vitest_1.expect)(renderedCount).toBeGreaterThan(0);
        (0, vitest_1.expect)(renderedCount).toBeLessThan(nodes.length);
        const firstNode = container.querySelector('[data-node-id="node-0"]');
        (0, vitest_1.expect)(firstNode).toBeTruthy();
        await (0, test_utils_1.act)(async () => {
            firstNode?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            firstNode?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, code: 'Space' }));
        });
        (0, vitest_1.expect)(onHover).toHaveBeenCalledWith('node-0');
        (0, vitest_1.expect)(onSelect).toHaveBeenCalledWith('node-0');
    });
    (0, vitest_1.it)('lowers detail level automatically when load exceeds threshold', async () => {
        const { nodes, edges } = (0, graph_js_1.buildFixtureGraph)(520);
        const container = document.createElement('div');
        const root = (0, client_1.createRoot)(container);
        await (0, test_utils_1.act)(async () => {
            root.render(<index_js_1.ProgressiveGraph nodes={nodes} edges={edges} initialBatchSize={40} frameBudgetMs={10}/>);
            await Promise.resolve();
        });
        const lod = container.querySelector('[data-lod]')?.getAttribute('data-lod');
        (0, vitest_1.expect)(lod).toBe('compact');
        const labels = Array.from(container.querySelectorAll('[data-node-id]')).map((node) => node.textContent);
        (0, vitest_1.expect)(labels.some((label) => label?.includes('…'))).toBe(true);
    });
    (0, vitest_1.it)('caps visible nodes under compact LOD while reporting elided counts', async () => {
        const { nodes, edges } = (0, graph_js_1.buildFixtureGraph)(2400, 40, 3);
        const container = document.createElement('div');
        const root = (0, client_1.createRoot)(container);
        await (0, test_utils_1.act)(async () => {
            root.render(<index_js_1.ProgressiveGraph nodes={nodes} edges={edges} initialBatchSize={120} frameBudgetMs={10}/>);
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        const region = container.querySelector('[role="region"]');
        const visibleCount = Number(region?.getAttribute('data-visible-count') ?? '0');
        const elidedCount = Number(region?.getAttribute('data-elided-count') ?? '0');
        const lod = region?.getAttribute('data-lod');
        (0, vitest_1.expect)(lod).toBe('compact');
        (0, vitest_1.expect)(visibleCount).toBeGreaterThan(0);
        (0, vitest_1.expect)(visibleCount).toBeLessThan(nodes.length);
        (0, vitest_1.expect)(elidedCount).toBe(nodes.length - visibleCount);
        (0, vitest_1.expect)(container.querySelectorAll('[data-node-id]').length).toBe(visibleCount);
        (0, vitest_1.expect)(region?.getAttribute('aria-busy')).toBe('false');
    });
    (0, vitest_1.it)('preserves progress when streaming batches arrive', async () => {
        const first = (0, graph_js_1.buildFixtureGraph)(60);
        const next = (0, graph_js_1.buildFixtureGraph)(140);
        const container = document.createElement('div');
        const root = (0, client_1.createRoot)(container);
        await (0, test_utils_1.act)(async () => {
            root.render(<index_js_1.ProgressiveGraph streaming nodes={first.nodes} edges={first.edges} initialBatchSize={18} frameBudgetMs={6}/>);
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        const firstRendered = Number(container
            .querySelector('[data-rendered-count]')
            ?.getAttribute('data-rendered-count'));
        await (0, test_utils_1.act)(async () => {
            root.render(<index_js_1.ProgressiveGraph streaming nodes={next.nodes} edges={next.edges} initialBatchSize={18} frameBudgetMs={6}/>);
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        const region = container.querySelector('[role="region"]');
        const renderSurface = container.querySelector('[data-rendered-count]');
        const secondRendered = Number(renderSurface?.getAttribute('data-rendered-count') ?? '0');
        (0, vitest_1.expect)(secondRendered).toBeGreaterThanOrEqual(firstRendered);
        (0, vitest_1.expect)(region?.getAttribute('data-streaming')).toBe('true');
        (0, vitest_1.expect)(container.querySelector('[data-streaming-indicator]')).toBeTruthy();
    });
});
