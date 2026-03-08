"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const react_1 = require("@testing-library/react");
const Badge_1 = require("./Badge");
const react_2 = __importDefault(require("react"));
(0, vitest_1.describe)('Badge Component', () => {
    (0, vitest_1.it)('renders children correctly', () => {
        (0, react_1.render)(<Badge_1.Badge>Test Badge</Badge_1.Badge>);
        (0, vitest_1.expect)(react_1.screen.getByText('Test Badge')).toBeDefined();
    });
    (0, vitest_1.it)('renders as a span element', () => {
        const { container } = (0, react_1.render)(<Badge_1.Badge>Test</Badge_1.Badge>);
        (0, vitest_1.expect)(container.firstChild?.nodeName).toBe('SPAN');
    });
    (0, vitest_1.it)('renders with an icon when provided', () => {
        const TestIcon = () => <span data-testid="test-icon">icon</span>;
        (0, react_1.render)(<Badge_1.Badge icon={<TestIcon />}>With Icon</Badge_1.Badge>);
        (0, vitest_1.expect)(react_1.screen.getByTestId('test-icon')).toBeDefined();
        (0, vitest_1.expect)(react_1.screen.getByText('With Icon')).toBeDefined();
    });
    (0, vitest_1.it)('applies variant classes correctly', () => {
        const { container } = (0, react_1.render)(<Badge_1.Badge variant="destructive">Destructive</Badge_1.Badge>);
        // Check if the element contains a partial class name from badgeVariants
        // 'bg-destructive' is part of the destructive variant
        (0, vitest_1.expect)(container.firstChild?.className).toContain('bg-destructive');
    });
});
