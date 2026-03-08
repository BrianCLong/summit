"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const CommandPalette_1 = __importDefault(require("./CommandPalette"));
describe('CommandPalette', () => {
    it('filters commands based on user input', () => {
        const handleCommandSelect = jest.fn();
        (0, react_2.render)(<CommandPalette_1.default open={true} onClose={() => { }} onCommandSelect={handleCommandSelect}/>);
        const input = react_2.screen.getByPlaceholderText('/call maestro | /present deck | /join room | /status api');
        react_2.fireEvent.change(input, { target: { value: 'scribe' } });
        expect(react_2.screen.getByText('Message Scribe')).toBeInTheDocument();
        expect(react_2.screen.queryByText('Start meeting')).not.toBeInTheDocument();
    });
});
