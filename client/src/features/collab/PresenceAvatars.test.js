"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const PresenceAvatars_1 = __importDefault(require("./PresenceAvatars"));
describe('PresenceAvatars', () => {
    it('renders user initials', () => {
        (0, react_1.render)(<PresenceAvatars_1.default users={[{ id: '1', name: 'Alice' }]}/>);
        expect(react_1.screen.getByText('A')).toBeInTheDocument();
    });
});
