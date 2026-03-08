"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const AgentEditDialog_1 = __importDefault(require("../../components/AgentEditDialog"));
test('renders diff and approves', async () => {
    const onApprove = jest.fn().mockResolvedValue(undefined);
    (0, react_2.render)(<AgentEditDialog_1.default open original={'a\nb'} onClose={() => { }} onApprove={onApprove}/>);
    expect(react_2.screen.getByLabelText('Draft text')).toBeInTheDocument();
    react_2.fireEvent.click(react_2.screen.getByText('Approve & apply'));
    expect(onApprove).toHaveBeenCalled();
});
