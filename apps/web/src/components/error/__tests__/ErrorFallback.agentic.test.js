"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const vitest_1 = require("vitest");
const ErrorFallback_1 = require("../ErrorFallback");
const evidenceLogger_1 = require("@/lib/evidenceLogger");
const ResilienceContext_1 = require("@/contexts/ResilienceContext");
// Mock dependencies
vitest_1.vi.mock('react-router-dom', () => ({
    useNavigate: () => vitest_1.vi.fn(),
}));
vitest_1.vi.mock('@/lib/evidenceLogger', () => ({
    logErrorEvidence: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('@/contexts/ResilienceContext', () => ({
    useResilience: vitest_1.vi.fn(),
}));
describe('ErrorFallback with Agentic Recovery', () => {
    beforeEach(() => {
        vitest_1.vi.clearAllMocks();
    });
    it('shows Ask Copilot button when agentic recovery is enabled', () => {
        ResilienceContext_1.useResilience.mockReturnValue({
            policy: { maxRetries: 3, retryBackoffMs: 2000, fallbackStrategy: 'agentic', reportErrors: true },
            agenticRecoveryEnabled: true,
        });
        (0, react_2.render)(<ErrorFallback_1.ErrorFallback error={new Error("Test")}/>);
        expect(react_2.screen.getByText('Ask Copilot')).toBeInTheDocument();
    });
    it('hides Ask Copilot button when agentic recovery is disabled', () => {
        ResilienceContext_1.useResilience.mockReturnValue({
            policy: { maxRetries: 3, retryBackoffMs: 2000, fallbackStrategy: 'simple', reportErrors: true },
            agenticRecoveryEnabled: false,
        });
        (0, react_2.render)(<ErrorFallback_1.ErrorFallback error={new Error("Test")}/>);
        expect(react_2.screen.queryByText('Ask Copilot')).not.toBeInTheDocument();
    });
    it('logs evidence on mount if policy allows', () => {
        ResilienceContext_1.useResilience.mockReturnValue({
            policy: { maxRetries: 3, retryBackoffMs: 2000, fallbackStrategy: 'simple', reportErrors: true },
            agenticRecoveryEnabled: false,
        });
        const err = new Error("Evidence Test");
        (0, react_2.render)(<ErrorFallback_1.ErrorFallback error={err}/>);
        expect(evidenceLogger_1.logErrorEvidence).toHaveBeenCalledWith(err);
    });
    it('does not log evidence if policy disables it', () => {
        ResilienceContext_1.useResilience.mockReturnValue({
            policy: { maxRetries: 3, retryBackoffMs: 2000, fallbackStrategy: 'simple', reportErrors: false },
            agenticRecoveryEnabled: false,
        });
        (0, react_2.render)(<ErrorFallback_1.ErrorFallback error={new Error("Test")}/>);
        expect(evidenceLogger_1.logErrorEvidence).not.toHaveBeenCalled();
    });
    it('triggers diagnosis when Ask Copilot is clicked', async () => {
        ResilienceContext_1.useResilience.mockReturnValue({
            policy: { maxRetries: 3, retryBackoffMs: 2000, fallbackStrategy: 'agentic', reportErrors: true },
            agenticRecoveryEnabled: true,
        });
        (0, react_2.render)(<ErrorFallback_1.ErrorFallback error={new Error("Test")}/>);
        const button = react_2.screen.getByText('Ask Copilot');
        react_2.fireEvent.click(button);
        expect(react_2.screen.getByText('Analyzing...')).toBeInTheDocument();
        // Wait for the simulated timeout
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText(/Copilot Diagnosis/)).toBeInTheDocument();
        }, { timeout: 2000 });
    });
});
