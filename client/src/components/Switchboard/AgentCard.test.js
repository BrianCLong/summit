"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const AgentCard_1 = __importDefault(require("./AgentCard"));
describe('AgentCard', () => {
    const mockAgents = [
        { id: 'agent1', name: 'Test Agent 1', tags: ['tag1', 'tag2'] },
    ];
    it('renders the agent card with all elements', () => {
        const handleChat = jest.fn();
        (0, react_2.render)(<AgentCard_1.default agents={mockAgents} onChat={handleChat}/>);
        expect(react_2.screen.getByText('Test Agent 1')).toBeInTheDocument();
        expect(react_2.screen.getByText('tag1 • tag2')).toBeInTheDocument();
        const chatButton = react_2.screen.getByText('Chat');
        react_2.fireEvent.click(chatButton);
        expect(handleChat).toHaveBeenCalledTimes(1);
    });
});
