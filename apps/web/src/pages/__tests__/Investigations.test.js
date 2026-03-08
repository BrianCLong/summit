"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const vitest_1 = require("vitest");
const Investigations_1 = __importDefault(require("../Investigations"));
const jest_axe_1 = require("jest-axe");
require("@testing-library/jest-dom");
// Mock ResizeObserver
global.ResizeObserver = vitest_1.vi.fn().mockImplementation(() => ({
    observe: vitest_1.vi.fn(),
    unobserve: vitest_1.vi.fn(),
    disconnect: vitest_1.vi.fn(),
}));
vitest_1.expect.extend(jest_axe_1.toHaveNoViolations);
(0, vitest_1.describe)('Investigations Page Accessibility', () => {
    (0, vitest_1.it)('should have no basic accessibility violations', async () => {
        const { container } = (0, react_2.render)(<Investigations_1.default />);
        // We wait for the graph to "mount" even if it's mock
        const results = await (0, jest_axe_1.axe)(container);
        (0, vitest_1.expect)(results).toHaveNoViolations();
    });
    (0, vitest_1.it)('should render correct ARIA labels for graph', () => {
        (0, react_2.render)(<Investigations_1.default />);
        const svg = react_2.screen.getByRole('img', { name: /Org Mesh graph/i });
        (0, vitest_1.expect)(svg).toBeInTheDocument();
        (0, vitest_1.expect)(svg).toHaveAttribute('aria-describedby', 'graph-desc');
    });
    (0, vitest_1.it)('should announce entity selection to screen readers', async () => {
        (0, react_2.render)(<Investigations_1.default />);
        // In our implementation, the graph nodes have role="graphics-symbol" and are focusable
        const nodes = react_2.screen.getAllByRole('graphics-symbol');
        const firstNode = nodes.find(n => n.getAttribute('aria-label')?.includes('Strategic Hub Alpha'));
        if (firstNode) {
            react_2.fireEvent.click(firstNode);
            // Check aria-live region (hidden)
            const announcement = react_2.screen.getByText(/Selected entity: Strategic Hub Alpha/i);
            (0, vitest_1.expect)(announcement).toBeInTheDocument();
            (0, vitest_1.expect)(announcement.parentElement).toHaveAttribute('aria-live', 'polite');
        }
    });
    (0, vitest_1.it)('should support keyboard navigation to nodes', () => {
        (0, react_2.render)(<Investigations_1.default />);
        const nodes = react_2.screen.getAllByRole('graphics-symbol').filter(n => n.tagName === 'g');
        if (nodes.length > 0) {
            const firstNode = nodes[0];
            (0, vitest_1.expect)(firstNode).toHaveAttribute('tabindex', '0');
            firstNode.focus();
            (0, vitest_1.expect)(document.activeElement).toBe(firstNode);
            react_2.fireEvent.keyDown(firstNode, { key: 'Enter' });
            (0, vitest_1.expect)(react_2.screen.getByText(/Strategic Hub Alpha/i)).toBeInTheDocument();
        }
    });
});
