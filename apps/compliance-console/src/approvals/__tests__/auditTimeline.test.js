"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const vitest_1 = require("vitest");
const AuditTimeline_1 = require("../AuditTimeline");
const mockData_1 = require("../mockData");
(0, vitest_1.describe)('AuditTimeline', () => {
    (0, vitest_1.it)('renders events sorted by time with correlation id', () => {
        const request = mockData_1.approvalsData[0];
        (0, react_1.render)(<AuditTimeline_1.AuditTimeline events={[...request.timeline].reverse()} correlationId={request.correlationId}/>);
        (0, vitest_1.expect)(react_1.screen.getByText(/Correlation: corr-abc/)).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getAllByRole('listitem')[0]).toHaveTextContent('Request submitted');
    });
});
