"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const ApprovalsList_1 = __importDefault(require("./ApprovalsList"));
const createFetchResponse = (data, ok = true) => Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(typeof data === 'string' ? data : 'Error'),
});
describe('ApprovalsList', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('shows loading state while fetching', () => {
        global.fetch = jest.fn(() => new Promise(() => {
            // Never resolve to keep loading visible for assertion
        }));
        (0, react_2.render)(<ApprovalsList_1.default />);
        expect(react_2.screen.getByText(/loading approvals/i)).toBeInTheDocument();
    });
    it('renders empty state when no approvals are returned', async () => {
        global.fetch = jest.fn(() => createFetchResponse([]));
        (0, react_2.render)(<ApprovalsList_1.default />);
        await (0, react_2.waitFor)(() => expect(react_2.screen.getByText(/no pending approvals/i)).toBeInTheDocument());
    });
    it('renders error state when the queue fails to load', async () => {
        global.fetch = jest.fn(() => createFetchResponse('Service unavailable', false));
        (0, react_2.render)(<ApprovalsList_1.default />);
        await (0, react_2.waitFor)(() => expect(react_2.screen.getByText(/failed to load approvals/i)).toBeInTheDocument());
    });
    it('requires rationale before approving or denying', async () => {
        const queue = [
            {
                id: 'appr-1',
                requester: 'alice',
                operation: 'Pause production pipeline',
                submittedAt: '2025-01-01T00:00:00Z',
                obligations: ['Audit receipt'],
                riskFlags: ['High blast radius'],
            },
        ];
        global.fetch = jest.fn(() => createFetchResponse(queue));
        (0, react_2.render)(<ApprovalsList_1.default />);
        await (0, react_2.waitFor)(() => expect(react_2.screen.getByText(/pause production pipeline/i)).toBeVisible());
        const approveButton = react_2.screen.getByRole('button', { name: /approve/i });
        react_2.fireEvent.click(approveButton);
        expect(react_2.screen.getByText(/rationale is required/i)).toBeInTheDocument();
        await user_event_1.default.type(react_2.screen.getByLabelText(/rationale/i), 'Reviewed by SRE.');
        react_2.fireEvent.click(react_2.screen.getByRole('button', { name: /deny/i }));
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});
