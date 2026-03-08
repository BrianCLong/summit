"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const HITLReviewPanel_1 = require("../HITLReviewPanel");
const vitest_1 = require("vitest");
// @ts-expect-error jest-axe has no bundled typings in this workspace
const jest_axe_1 = require("jest-axe");
expect.extend(jest_axe_1.toHaveNoViolations);
describe('HITLReviewPanel', () => {
    const mockData = { id: '123', content: 'test data' };
    const mockOnDecision = vitest_1.vi.fn();
    it('renders task and workflow details', () => {
        (0, react_1.render)(<HITLReviewPanel_1.HITLReviewPanel taskId="task-123" workflowId="workflow-456" data={mockData} onDecision={mockOnDecision}/>);
        expect(react_1.screen.getByText(/task: task-123/i)).toBeInTheDocument();
        expect(react_1.screen.getByText(/workflow: workflow-456/i)).toBeInTheDocument();
    });
    it('has no accessibility violations', async () => {
        const { container } = (0, react_1.render)(<HITLReviewPanel_1.HITLReviewPanel taskId="task-123" workflowId="workflow-456" data={mockData} onDecision={mockOnDecision}/>);
        const results = await (0, jest_axe_1.axe)(container);
        expect(results).toHaveNoViolations();
    });
    it('handles decision selection and submission', () => {
        (0, react_1.render)(<HITLReviewPanel_1.HITLReviewPanel taskId="task-123" workflowId="workflow-456" data={mockData} onDecision={mockOnDecision}/>);
        // Select 'Approve'
        // Target by label to prove accessibility
        const select = react_1.screen.getByLabelText(/decision/i);
        react_1.fireEvent.change(select, { target: { value: 'approved' } });
        const button = react_1.screen.getByRole('button', { name: /submit decision/i });
        expect(button).toBeEnabled();
        react_1.fireEvent.click(button);
        expect(mockOnDecision).toHaveBeenCalledWith('task-123', 'approved', '');
    });
    it('shows reason field when rejected is selected', () => {
        (0, react_1.render)(<HITLReviewPanel_1.HITLReviewPanel taskId="task-123" workflowId="workflow-456" data={mockData} onDecision={mockOnDecision}/>);
        const select = react_1.screen.getByLabelText(/decision/i);
        react_1.fireEvent.change(select, { target: { value: 'rejected' } });
        expect(react_1.screen.getByLabelText(/reason for rejection/i)).toBeInTheDocument();
    });
    it('shows loading state when submitting', () => {
        (0, react_1.render)(<HITLReviewPanel_1.HITLReviewPanel taskId="task-123" workflowId="workflow-456" data={mockData} onDecision={mockOnDecision} isSubmitting={true}/>);
        const button = react_1.screen.getByRole('button', { name: /submit decision/i });
        expect(button).toBeDisabled();
        // Button likely contains a spinner or loading text, check for disabled state is key
    });
});
