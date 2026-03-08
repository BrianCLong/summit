"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const react_1 = require("@testing-library/react");
const EmptyState_1 = require("./EmptyState");
(0, vitest_1.describe)('EmptyState', () => {
    (0, vitest_1.it)('renders title and description', () => {
        const { getByText } = (0, react_1.render)(<EmptyState_1.EmptyState title="Test Title" description="Test Description"/>);
        (0, vitest_1.expect)(getByText('Test Title')).toBeDefined();
        (0, vitest_1.expect)(getByText('Test Description')).toBeDefined();
    });
    (0, vitest_1.it)('renders the chart icon when icon="chart"', () => {
        const { container } = (0, react_1.render)(<EmptyState_1.EmptyState title="Test" icon="chart"/>);
        // BarChart3 should be rendered. We can check if a lucide icon is present.
        const icon = container.querySelector('.lucide-bar-chart-3');
        (0, vitest_1.expect)(icon).not.toBeNull();
    });
    (0, vitest_1.it)('renders the activity icon when icon="activity"', () => {
        const { container } = (0, react_1.render)(<EmptyState_1.EmptyState title="Test" icon="activity"/>);
        const icon = container.querySelector('.lucide-activity');
        (0, vitest_1.expect)(icon).not.toBeNull();
    });
    (0, vitest_1.it)('icon container has aria-hidden="true"', () => {
        const { container } = (0, react_1.render)(<EmptyState_1.EmptyState title="Test"/>);
        const iconContainer = container.querySelector('[aria-hidden="true"]');
        (0, vitest_1.expect)(iconContainer).not.toBeNull();
        (0, vitest_1.expect)(iconContainer?.classList.contains('bg-muted')).toBe(true);
    });
});
