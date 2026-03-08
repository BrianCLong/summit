"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const react_1 = require("@testing-library/react");
// @ts-expect-error jest-axe has no bundled typings in this workspace
const jest_axe_1 = require("jest-axe");
const Button_1 = require("./Button");
const input_1 = require("./input");
// Extend expect with jest-axe
vitest_1.expect.extend(jest_axe_1.toHaveNoViolations);
(0, vitest_1.describe)('Accessibility', () => {
    (0, vitest_1.it)('Button should have no accessibility violations', async () => {
        const { container } = (0, react_1.render)(<Button_1.Button>Click me</Button_1.Button>);
        const results = await (0, jest_axe_1.axe)(container);
        (0, vitest_1.expect)(results).toHaveNoViolations();
    });
    (0, vitest_1.it)('Input should have no accessibility violations when labeled', async () => {
        const { container } = (0, react_1.render)(<div>
        <label htmlFor="test-input">Label</label>
        <input_1.Input id="test-input" placeholder="Enter text"/>
      </div>);
        const results = await (0, jest_axe_1.axe)(container);
        (0, vitest_1.expect)(results).toHaveNoViolations();
    });
    (0, vitest_1.it)('Button loading state UX', () => {
        // Standard button: shows spinner + text
        const { container: stdContainer, getByText: getByTextStd } = (0, react_1.render)(<Button_1.Button loading>Click me</Button_1.Button>);
        (0, vitest_1.expect)(getByTextStd('Click me')).toBeDefined();
        const stdSpinner = stdContainer.querySelector('.animate-spin');
        (0, vitest_1.expect)(stdSpinner).toBeDefined();
        (0, vitest_1.expect)(stdSpinner?.classList.contains('mr-2')).toBe(true);
        // Icon button: shows ONLY spinner (no text, no margin)
        const { container: iconContainer, queryByTestId } = (0, react_1.render)(<Button_1.Button size="icon" loading>
        <span data-testid="icon-child">Icon</span>
      </Button_1.Button>);
        (0, vitest_1.expect)(queryByTestId('icon-child')).toBeNull();
        const iconSpinner = iconContainer.querySelector('.animate-spin');
        (0, vitest_1.expect)(iconSpinner).toBeDefined();
        (0, vitest_1.expect)(iconSpinner?.classList.contains('mr-2')).toBe(false);
    });
    (0, vitest_1.it)('Button should have aria-busy when loading', () => {
        const { getByRole } = (0, react_1.render)(<Button_1.Button loading>Click me</Button_1.Button>);
        const button = getByRole('button');
        (0, vitest_1.expect)(button.getAttribute('aria-busy')).toBe('true');
    });
    (0, vitest_1.it)('Spinner should have role="status" and aria-label', () => {
        const { getByRole } = (0, react_1.render)(<Button_1.Button loading size="icon">Icon</Button_1.Button>);
        const spinner = getByRole('status');
        (0, vitest_1.expect)(spinner).toBeDefined();
        (0, vitest_1.expect)(spinner.getAttribute('aria-label')).toBe('Loading');
    });
});
