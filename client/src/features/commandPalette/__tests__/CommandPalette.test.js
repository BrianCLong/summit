"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const CommandPalette_1 = __importDefault(require("../CommandPalette"));
const commandRegistry_1 = require("../commandRegistry");
describe('CommandPalette', () => {
    beforeEach(() => {
        (0, commandRegistry_1.__resetCommandRegistryForTests)();
    });
    test('opens and closes via controls', () => {
        const unregister = (0, commandRegistry_1.registerCommand)({
            id: 'demo',
            title: 'Demo command',
            description: 'Does a thing',
            action: () => { },
        });
        const onClose = jest.fn();
        (0, react_2.render)(<CommandPalette_1.default open onClose={onClose}/>);
        expect(react_2.screen.getByLabelText(/Command palette search/i)).toBeInTheDocument();
        react_2.fireEvent.click(react_2.screen.getByLabelText(/Close command palette/i));
        expect(onClose).toHaveBeenCalled();
        unregister();
    });
    test('filters commands via fuzzy search', () => {
        (0, commandRegistry_1.registerCommand)({
            id: 'graph',
            title: 'Open graph explorer',
            description: 'Jump to the graph',
            action: () => { },
        });
        (0, commandRegistry_1.registerCommand)({
            id: 'settings',
            title: 'Open settings',
            description: 'Admin settings',
            action: () => { },
        });
        (0, react_2.render)(<CommandPalette_1.default open onClose={() => { }}/>);
        const input = react_2.screen.getByLabelText(/Command palette search/i);
        react_2.fireEvent.change(input, { target: { value: 'graph' } });
        expect(react_2.screen.getByText(/Open graph explorer/)).toBeInTheDocument();
        expect(react_2.screen.queryByText(/Open settings/)).not.toBeInTheDocument();
    });
    test('supports keyboard selection with enter', () => {
        const action = jest.fn();
        (0, commandRegistry_1.registerCommand)({
            id: 'case',
            title: 'Open case workspace',
            description: 'Navigate to cases',
            action,
        });
        (0, react_2.render)(<CommandPalette_1.default open onClose={() => { }}/>);
        const search = react_2.screen.getByLabelText(/Command palette search/i);
        react_2.fireEvent.keyDown(search, { key: 'ArrowDown' });
        react_2.fireEvent.keyDown(search, { key: 'Enter' });
        expect(action).toHaveBeenCalledTimes(1);
    });
});
