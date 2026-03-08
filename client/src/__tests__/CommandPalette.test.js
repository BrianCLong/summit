"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const CommandPalette_1 = __importDefault(require("../components/CommandPalette"));
describe('CommandPalette', () => {
    it('opens on Ctrl+Shift+P', async () => {
        (0, react_2.render)(<CommandPalette_1.default />);
        expect(react_2.screen.queryByPlaceholderText(/Type a command/i)).not.toBeInTheDocument();
        react_2.fireEvent.keyDown(window, {
            key: 'p',
            code: 'KeyP',
            ctrlKey: true,
            shiftKey: true,
        });
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument();
        });
    });
    it('supports keyboard navigation', async () => {
        (0, react_2.render)(<CommandPalette_1.default />);
        // Open it
        react_2.fireEvent.keyDown(window, {
            key: 'p',
            code: 'KeyP',
            ctrlKey: true,
            shiftKey: true,
        });
        const input = await react_2.screen.findByPlaceholderText(/Type a command/i);
        // Initial state: index 0 selected.
        const items = react_2.screen.getAllByRole('option');
        expect(items[0]).toHaveAttribute('aria-selected', 'true');
        // ArrowDown -> Selects index 1
        react_2.fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
        expect(items[0]).toHaveAttribute('aria-selected', 'false');
        expect(items[1]).toHaveAttribute('aria-selected', 'true');
    });
});
