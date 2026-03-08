"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any -- jest mocks require type assertions */
const globals_1 = require("@jest/globals");
const react_1 = require("@testing-library/react");
const DsarReviewer_1 = require("../DsarReviewer");
describe('DsarReviewer', () => {
    const baseRequests = [
        {
            id: 'req-1',
            subjectId: 'sub-1',
            tenantId: 'tenant-1',
            operation: 'export',
            status: 'completed',
            submittedAt: '2025-09-01T00:00:00.000Z',
            replayAvailable: true,
            exportLocation: 's3://bucket/req-1.json',
        },
        {
            id: 'req-2',
            subjectId: 'sub-2',
            tenantId: 'tenant-2',
            operation: 'delete',
            status: 'pending',
            submittedAt: '2025-09-02T12:00:00.000Z',
            replayAvailable: false,
            proofs: [{ connector: 'postgres', type: 'deletion', hash: 'abc12345' }],
        },
    ];
    it('renders requests and surfaces replay actions', () => {
        const onReplay = globals_1.jest.fn();
        (0, react_1.render)(<DsarReviewer_1.DsarReviewer requests={baseRequests} onReplay={onReplay}/>);
        expect(react_1.screen.getByText('DSAR Review Queue')).toBeInTheDocument();
        expect(react_1.screen.getByText('sub-1')).toBeInTheDocument();
        expect(react_1.screen.getByText('sub-2')).toBeInTheDocument();
        const replayButton = react_1.screen.getByRole('button', {
            name: /Replay DSAR request req-1/i,
        });
        react_1.fireEvent.click(replayButton);
        expect(onReplay).toHaveBeenCalledWith('req-1');
    });
    it('shows request details when selected', () => {
        (0, react_1.render)(<DsarReviewer_1.DsarReviewer requests={baseRequests}/>);
        react_1.fireEvent.click(react_1.screen.getByText('sub-2'));
        expect(react_1.screen.getByText(/Request ID:/)).toHaveTextContent('req-2');
        expect(react_1.screen.getByText(/Proofs/)).toBeInTheDocument();
    });
});
