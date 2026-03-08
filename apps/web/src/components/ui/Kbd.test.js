"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const react_1 = require("@testing-library/react");
const Kbd_1 = require("./Kbd");
const react_2 = __importDefault(require("react"));
(0, vitest_1.describe)('Kbd Component', () => {
    (0, vitest_1.it)('renders children correctly', () => {
        (0, react_1.render)(<Kbd_1.Kbd>K</Kbd_1.Kbd>);
        (0, vitest_1.expect)(react_1.screen.getByText('K')).toBeDefined();
    });
    (0, vitest_1.it)('transforms "mod" to platform-aware modifier', () => {
        (0, react_1.render)(<Kbd_1.Kbd>mod+K</Kbd_1.Kbd>);
        // On the test environment, isMac might be false, so it should be "Ctrl"
        // But it could be anything depending on the environment.
        // The component uses MODIFIER_KEY from utils.ts
        const elements = react_1.screen.getAllByText(/.*/);
        const texts = elements.map(el => el.textContent);
        (0, vitest_1.expect)(texts.some(t => t === '⌘' || t === 'Ctrl')).toBe(true);
    });
    (0, vitest_1.it)('transforms "shift" correctly', () => {
        (0, react_1.render)(<Kbd_1.Kbd>shift+S</Kbd_1.Kbd>);
        const elements = react_1.screen.getAllByText(/.*/);
        const texts = elements.map(el => el.textContent);
        (0, vitest_1.expect)(texts.some(t => t === '⇧' || t === 'Shift')).toBe(true);
    });
});
