"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const vitest_1 = require("vitest");
const react_2 = require("@testing-library/react");
const PRTriagePage_1 = require("../PRTriagePage");
const KeyboardShortcutsContext_1 = require("@/contexts/KeyboardShortcutsContext");
// window.open is not defined in jsdom
vitest_1.vi.stubGlobal('open', vitest_1.vi.fn());
const renderPage = () => (0, react_2.render)(<KeyboardShortcutsContext_1.KeyboardShortcutsProvider>
      <PRTriagePage_1.PRTriagePage />
    </KeyboardShortcutsContext_1.KeyboardShortcutsProvider>);
(0, vitest_1.describe)('PRTriagePage', () => {
    (0, vitest_1.beforeEach)(() => {
        window.localStorage.clear();
    });
    (0, vitest_1.it)('renders the tri-pane layout', async () => {
        renderPage();
        (0, vitest_1.expect)(react_2.screen.getByText('PR Triage Workspace')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('PR Queue')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('Diff Preview')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('Risk & Actions')).toBeInTheDocument();
    });
    (0, vitest_1.it)('renders status bucket filter pills', () => {
        renderPage();
        (0, vitest_1.expect)(react_2.screen.getByText(/Merge Ready/i)).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText(/Conflict/i)).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText(/Needs Review/i)).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText(/Governance Block/i)).toBeInTheDocument();
    });
    (0, vitest_1.it)('renders priority and assignee filter controls', () => {
        renderPage();
        (0, vitest_1.expect)(react_2.screen.getByLabelText('Priority')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByLabelText('Assignee')).toBeInTheDocument();
    });
    (0, vitest_1.it)('shows mock PRs in the queue after loading', async () => {
        renderPage();
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByText(/branch convergence metrics/i)).toBeInTheDocument();
        });
        (0, vitest_1.expect)(react_2.screen.getByText(/governance conflict/i)).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText(/PR triage workspace/i)).toBeInTheDocument();
    });
    (0, vitest_1.it)('selects a PR and shows diff preview on click', async () => {
        renderPage();
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByText(/branch convergence metrics/i)).toBeInTheDocument();
        });
        // The first PR row button should be auto-selected; click a second one
        const conflictRow = react_2.screen.getAllByRole('button', { pressed: false })[0];
        react_2.fireEvent.click(conflictRow);
        // After clicking, the branch convergence section should appear in diff preview
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getAllByText(/Branch Convergence/i).length).toBeGreaterThanOrEqual(1);
        });
    });
    (0, vitest_1.it)('displays risk checklist for the active PR', async () => {
        renderPage();
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByText(/branch convergence metrics/i)).toBeInTheDocument();
        });
        // Risk Checklist section should be visible for the auto-selected first PR
        (0, vitest_1.expect)(react_2.screen.getByText('Risk Checklist')).toBeInTheDocument();
    });
    (0, vitest_1.it)('shows "pass" / "fail" badges in the risk checklist', async () => {
        renderPage();
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByText('Risk Checklist')).toBeInTheDocument();
        });
        const passBadges = react_2.screen.getAllByText('pass');
        (0, vitest_1.expect)(passBadges.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('filters by status bucket', async () => {
        renderPage();
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByText(/branch convergence metrics/i)).toBeInTheDocument();
        });
        // Click "Conflict" bucket pill
        const conflictPill = react_2.screen.getByRole('button', { name: /Conflict \(\d+\)/i });
        react_2.fireEvent.click(conflictPill);
        await (0, react_2.waitFor)(() => {
            // The conflict PR should still be visible
            (0, vitest_1.expect)(react_2.screen.getByText(/governance conflict/i)).toBeInTheDocument();
            // The merge-ready PR should no longer be in the queue
            (0, vitest_1.expect)(react_2.screen.queryByText(/branch convergence metrics/i)).not.toBeInTheDocument();
        });
    });
    (0, vitest_1.it)('filters by priority', async () => {
        renderPage();
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByText(/branch convergence metrics/i)).toBeInTheDocument();
        });
        const prioritySelect = react_2.screen.getByLabelText('Priority');
        react_2.fireEvent.change(prioritySelect, { target: { value: 'low' } });
        await (0, react_2.waitFor)(() => {
            // Only the docs PR is low priority
            (0, vitest_1.expect)(react_2.screen.getByText(/triage-runbook/i)).toBeInTheDocument();
            (0, vitest_1.expect)(react_2.screen.queryByText(/branch convergence metrics/i)).not.toBeInTheDocument();
        });
    });
    (0, vitest_1.it)('shows branch convergence info in diff preview', async () => {
        renderPage();
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByText(/branch convergence metrics/i)).toBeInTheDocument();
        });
        // Click the merge-ready PR (PR #101)
        const prRow = react_2.screen.getByText(/branch convergence metrics/i).closest('button');
        if (prRow)
            react_2.fireEvent.click(prRow);
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByText(/Merges cleanly against main/i)).toBeInTheDocument();
        });
    });
    (0, vitest_1.it)('shows conflict status in branch convergence for conflict PRs', async () => {
        renderPage();
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByText(/governance conflict/i)).toBeInTheDocument();
        });
        // Click the conflict PR row
        const conflictRow = react_2.screen.getByText(/governance conflict/i).closest('button');
        if (conflictRow)
            react_2.fireEvent.click(conflictRow);
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByText(/Merge conflict against main/i)).toBeInTheDocument();
        });
    });
    (0, vitest_1.it)('renders collapsed diff files that expand on click', async () => {
        renderPage();
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByText(/branch convergence metrics/i)).toBeInTheDocument();
        });
        // PR #101 diff: apps/api/src/routes/convergence.ts should be expandable
        // First file auto-expands; clicking the second should expand it
        const secondFile = react_2.screen.getByText('apps/api/src/routes/convergence.test.ts');
        (0, vitest_1.expect)(secondFile).toBeInTheDocument();
        react_2.fireEvent.click(secondFile.closest('button'));
        await (0, react_2.waitFor)(() => {
            // After expanding, the patch content is rendered
            (0, vitest_1.expect)(react_2.screen.getAllByText(/\+const new_/i).length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.it)('has Quick Assign input and Assign button', async () => {
        renderPage();
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByText(/branch convergence metrics/i)).toBeInTheDocument();
        });
        (0, vitest_1.expect)(react_2.screen.getByLabelText('Quick Assign')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByRole('button', { name: /assign/i })).toBeInTheDocument();
    });
    (0, vitest_1.it)('shows approve / request-changes / defer action buttons', async () => {
        renderPage();
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByText(/branch convergence metrics/i)).toBeInTheDocument();
        });
        (0, vitest_1.expect)(react_2.screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByRole('button', { name: /request changes/i })).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByRole('button', { name: /defer/i })).toBeInTheDocument();
    });
    (0, vitest_1.it)('reset button restores mock data', async () => {
        renderPage();
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByText(/branch convergence metrics/i)).toBeInTheDocument();
        });
        const resetBtn = react_2.screen.getByLabelText('Reset PR queue');
        react_2.fireEvent.click(resetBtn);
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByText(/branch convergence metrics/i)).toBeInTheDocument();
        });
    });
});
