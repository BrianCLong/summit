"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any -- jest mocks require type assertions */
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const globals_1 = require("@jest/globals");
const styles_1 = require("@mui/material/styles");
const PageShell_1 = require("../components/PageShell");
const SettingsLayout_1 = require("../components/SettingsLayout");
const DataTable_1 = require("../components/DataTable");
const OnboardingWizard_1 = require("../components/OnboardingWizard");
const telemetry_1 = require("../telemetry");
const theme_1 = require("../theme");
const tokens_1 = require("../tokens");
const DesignSystemProvider_1 = require("../DesignSystemProvider");
const renderWithTheme = (ui) => {
    const theme = (0, theme_1.buildDesignSystemTheme)({ mode: 'light', tokens: tokens_1.lightTokens });
    return (0, react_2.render)(<styles_1.ThemeProvider theme={theme}>{ui}</styles_1.ThemeProvider>);
};
(0, globals_1.describe)('Design system components', () => {
    (0, globals_1.afterEach)(() => {
        localStorage.clear();
    });
    (0, globals_1.it)('renders permission gating message in PageShell', () => {
        renderWithTheme(<PageShell_1.PageShell title="Settings" permission={{ allowed: false, reason: 'Requires admin' }}>
        <div>content</div>
      </PageShell_1.PageShell>);
        expect(react_2.screen.getByText(/You don’t have access/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Requires admin/)).toBeInTheDocument();
    });
    (0, globals_1.it)('tracks sections in SettingsLayout telemetry', () => {
        const telemetry = new telemetry_1.DesignSystemTelemetry({
            send: globals_1.jest.fn().mockResolvedValue(undefined),
        }, { autoFlushMs: null });
        const recordSpy = globals_1.jest.spyOn(telemetry, 'record');
        renderWithTheme(<DesignSystemProvider_1.TelemetryContext.Provider value={telemetry}>
        <SettingsLayout_1.SettingsLayout title="Account" sections={[
                { title: 'Profile', description: 'User profile', content: <div>Profile</div> },
                { title: 'Notifications', content: <div>Notifications</div> },
            ]}/>
      </DesignSystemProvider_1.TelemetryContext.Provider>);
        expect(recordSpy).toHaveBeenCalledWith('SettingsLayout', '1.0.0', { sections: ['Profile', 'Notifications'] });
    });
    (0, globals_1.it)('shows empty state and retry for DataTable', () => {
        const handleRetry = globals_1.jest.fn();
        renderWithTheme(<DataTable_1.DataTable title="Investigations" rows={[]} columns={[{ field: 'name', headerName: 'Name', width: 150 }]} loading={false} onRetry={handleRetry}/>);
        expect(react_2.screen.getByText(/No results found/)).toBeInTheDocument();
        react_2.fireEvent.click(react_2.screen.getByRole('button', { name: /Retry/ }));
        expect(handleRetry).toHaveBeenCalled();
    });
    (0, globals_1.it)('persists onboarding wizard progress', () => {
        const flowId = 'setup';
        const steps = [
            { id: 'welcome', title: 'Welcome', render: () => <div>Welcome</div>, isComplete: () => true },
            { id: 'profile', title: 'Profile', render: () => <div>Profile</div>, isComplete: () => true },
        ];
        renderWithTheme(<OnboardingWizard_1.OnboardingWizard flowId={flowId} steps={steps}/>);
        react_2.fireEvent.click(react_2.screen.getByRole('button', { name: /Next/ }));
        expect(localStorage.getItem('onboarding-wizard:setup')).toBe('1');
    });
});
