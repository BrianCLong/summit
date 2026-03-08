"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const vitest_1 = require("vitest");
const Button_1 = require("@/components/ui/Button");
(0, vitest_1.describe)('Button', () => {
    (0, vitest_1.it)('renders correctly', () => {
        (0, react_2.render)(<Button_1.Button>Click me</Button_1.Button>);
        (0, vitest_1.expect)(react_2.screen.getByRole('button', { name: /click me/i })).toBeDefined();
    });
    (0, vitest_1.it)('applies variant classes', () => {
        (0, react_2.render)(<Button_1.Button variant="destructive">Delete</Button_1.Button>);
        const button = react_2.screen.getByRole('button', { name: /delete/i });
        (0, vitest_1.expect)(button.className).toContain('bg-destructive');
    });
});
