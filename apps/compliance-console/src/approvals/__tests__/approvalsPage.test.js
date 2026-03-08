"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const vitest_1 = require("vitest");
const ApprovalsPage_1 = require("../ApprovalsPage");
(0, vitest_1.describe)('ApprovalsPage', () => {
    (0, vitest_1.it)('renders list and records approval with timeline update', () => {
        (0, react_1.render)(<ApprovalsPage_1.ApprovalsPage />);
        const items = react_1.screen.getAllByText(/Enable switchboard dual routing/);
        (0, vitest_1.expect)(items.length).toBeGreaterThan(0);
        react_1.fireEvent.click(react_1.screen.getByText('Approve'));
        (0, vitest_1.expect)(react_1.screen.getByText(/Approval recorded/)).toBeInTheDocument();
    });
});
