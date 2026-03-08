"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const vitest_1 = require("vitest");
const ApprovalDetails_1 = require("../ApprovalDetails");
const mockData_1 = require("../mockData");
(0, vitest_1.describe)('ApprovalDetails', () => {
    (0, vitest_1.it)('blocks approval when ABAC denies', () => {
        const request = mockData_1.approvalsData[0];
        const user = { ...mockData_1.demoUser, tenants: ['other'] };
        const onDecision = vitest_1.vi.fn();
        (0, react_1.render)(<ApprovalDetails_1.ApprovalDetails request={request} user={user} onDecision={onDecision}/>);
        react_1.fireEvent.click(react_1.screen.getByText('Approve'));
        (0, vitest_1.expect)(onDecision).toHaveBeenCalled();
        const action = onDecision.mock.calls[0][0];
        (0, vitest_1.expect)(action.decision).toBe('denied');
        (0, vitest_1.expect)(action.rationale).toMatch(/tenant/i);
    });
    (0, vitest_1.it)('captures rationale and sets waiting status for dual control', () => {
        const request = mockData_1.approvalsData[0];
        const onDecision = vitest_1.vi.fn();
        (0, react_1.render)(<ApprovalDetails_1.ApprovalDetails request={request} user={mockData_1.demoUser} onDecision={onDecision}/>);
        react_1.fireEvent.change(react_1.screen.getByLabelText('rationale'), {
            target: { value: 'Approving after review' },
        });
        react_1.fireEvent.click(react_1.screen.getByText('Approve'));
        (0, vitest_1.expect)(onDecision).toHaveBeenCalled();
        const action = onDecision.mock.calls[0][0];
        (0, vitest_1.expect)(action.decision).toBe('approved');
        (0, vitest_1.expect)(action.statusOverride).toBe('waiting_dual');
        (0, vitest_1.expect)(action.rationale).toBe('Approving after review');
    });
});
