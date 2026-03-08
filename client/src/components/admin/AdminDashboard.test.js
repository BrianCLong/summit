"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const styles_1 = require("@mui/material/styles");
const AdminDashboard_1 = __importDefault(require("./AdminDashboard"));
const renderDashboard = () => (0, react_2.render)(<styles_1.ThemeProvider theme={(0, styles_1.createTheme)()}>
      <AdminDashboard_1.default />
    </styles_1.ThemeProvider>);
describe('AdminDashboard', () => {
    test('renders core administrative sections', () => {
        renderDashboard();
        expect(react_2.screen.getByText(/Summit Admin Control Center/i)).toBeInTheDocument();
        expect(react_2.screen.getByText(/User management/i)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Audit log/i)).toBeInTheDocument();
        expect(react_2.screen.getByText(/System health/i)).toBeInTheDocument();
    });
    test('allows updating roles and batch status', () => {
        renderDashboard();
        const rolesSelect = react_2.screen.getByLabelText(/Roles for Alice Carter/i);
        react_2.fireEvent.mouseDown(rolesSelect);
        const supportOption = react_2.screen.getByRole('option', { name: 'Support' });
        react_2.fireEvent.click(supportOption);
        expect(react_2.screen.getAllByText('Support').length).toBeGreaterThan(1);
        const selectionCheckbox = react_2.screen.getByLabelText('Select Alice Carter');
        react_2.fireEvent.click(selectionCheckbox);
        const suspendButton = react_2.screen.getByRole('button', { name: /Suspend/i });
        react_2.fireEvent.click(suspendButton);
        expect(react_2.screen.getByTestId('status-user-1')).toHaveTextContent('Suspended');
    });
    test('filters audit entries by severity', () => {
        renderDashboard();
        const severitySelect = react_2.screen.getByLabelText(/Severity/i);
        react_2.fireEvent.mouseDown(severitySelect);
        const securityOption = react_2.screen.getByRole('option', { name: /Security/i });
        react_2.fireEvent.click(securityOption);
        expect(react_2.screen.getByText(/Privilege escalation blocked/i)).toBeInTheDocument();
        expect(react_2.screen.queryByText(/Weekly backup completed/i)).not.toBeInTheDocument();
    });
    test('toggles feature flags', () => {
        renderDashboard();
        const flagToggle = react_2.screen.getByLabelText(/Feature flag: Advanced graph heuristics/i);
        expect(flagToggle).not.toBeChecked();
        react_2.fireEvent.click(flagToggle);
        expect(flagToggle).toBeChecked();
    });
});
