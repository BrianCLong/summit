"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const vitest_1 = require("vitest");
const react_2 = require("@testing-library/react");
const ReviewQueuePage_1 = require("../ReviewQueuePage");
const KeyboardShortcutsContext_1 = require("@/contexts/KeyboardShortcutsContext");
const renderPage = () => (0, react_2.render)(<KeyboardShortcutsContext_1.KeyboardShortcutsProvider>
      <ReviewQueuePage_1.ReviewQueuePage />
    </KeyboardShortcutsContext_1.KeyboardShortcutsProvider>);
(0, vitest_1.describe)('ReviewQueuePage', () => {
    (0, vitest_1.beforeEach)(() => {
        window.localStorage.clear();
    });
    (0, vitest_1.it)('renders tri-pane layout with filters, preview, and actions', () => {
        renderPage();
        (0, vitest_1.expect)(react_2.screen.getByText('Review Queue')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('Filters')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('Preview')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('Actions')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByLabelText('Type')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByLabelText('Priority')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByLabelText('Assignee')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByLabelText('Status')).toBeInTheDocument();
    });
    vitest_1.it.skip('approves an item and removes it from the open queue', async () => {
        renderPage();
        const targetTitle = 'Evidence snippet: anomalous fund transfer';
        const item = await react_2.screen.findByText(targetTitle);
        react_2.fireEvent.click(item);
        react_2.fireEvent.click(react_2.screen.getByText('Approve'));
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.queryByText(targetTitle)).not.toBeInTheDocument();
        });
    });
});
