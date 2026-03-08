"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const vitest_1 = require("vitest");
const test_utils_1 = require("react-dom/test-utils");
const client_1 = require("react-dom/client");
const GraphExperiencePanel_js_1 = require("./GraphExperiencePanel.js");
function render(component) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = (0, client_1.createRoot)(container);
    return {
        container,
        root,
        unmount: () => {
            root.unmount();
            container.remove();
        },
    };
}
(0, vitest_1.describe)('GraphExperiencePanel', () => {
    (0, vitest_1.it)('surfaces hairball guidance for large dense graphs', () => {
        const { container, unmount, root } = render(<GraphExperiencePanel_js_1.GraphExperiencePanel nodeCount={1500} edgeCount={4000}/>);
        (0, vitest_1.expect)(container.textContent).toContain('Scale guard required');
        (0, test_utils_1.act)(() => root.unmount());
        unmount();
    });
    (0, vitest_1.it)('reveals advanced analysis via progressive disclosure', () => {
        const { container, unmount } = render(<GraphExperiencePanel_js_1.GraphExperiencePanel nodeCount={120} edgeCount={140}/>);
        const toggle = container.querySelector('[data-accordion-toggle]');
        (0, vitest_1.expect)(container.querySelector('[data-accordion-panel]')).toBeNull();
        (0, test_utils_1.act)(() => {
            toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        (0, vitest_1.expect)(container.querySelector('[data-accordion-panel]')).not.toBeNull();
        (0, vitest_1.expect)(container.textContent).toContain('Graph Algorithms');
        (0, vitest_1.expect)(container.textContent).toContain('Narrative Simulation');
        unmount();
    });
    (0, vitest_1.it)('exposes contextual help for ML predictions by default expansion', () => {
        const { container, unmount } = render(<GraphExperiencePanel_js_1.GraphExperiencePanel nodeCount={10} edgeCount={8} defaultExpandedSections={{ advanced: true }}/>);
        const helperButton = container.querySelector('button[aria-label="This predicts missing relationships using AI and calls out low-confidence links before merge."]');
        (0, vitest_1.expect)(helperButton).not.toBeNull();
        (0, vitest_1.expect)(container.textContent).toContain('Predicts missing relationships using AI');
        unmount();
    });
});
