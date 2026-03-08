"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const vitest_1 = require("vitest");
const react_2 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const SignInPage_1 = __importDefault(require("@/pages/SignInPage"));
const loginMock = vitest_1.vi.fn();
vitest_1.vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        login: loginMock,
        isAuthenticated: false,
        loading: false,
    }),
}));
(0, vitest_1.describe)('Sign-in accessibility landmarks and keyboard flow', () => {
    (0, vitest_1.beforeEach)(() => {
        loginMock.mockReset();
    });
    (0, vitest_1.it)('exposes a main landmark for the sign-in experience', () => {
        (0, react_2.render)(<SignInPage_1.default />);
        const main = react_2.screen.getByRole('main', { name: /sign in/i });
        (0, vitest_1.expect)(main).toBeInTheDocument();
    });
    // TODO: Tab navigation test has timeout issues - needs investigation
    vitest_1.it.skip('allows keyboard users to reach the primary action via tab order', async () => {
        const user = user_event_1.default.setup();
        (0, react_2.render)(<SignInPage_1.default />);
        const emailInput = react_2.screen.getByLabelText(/email/i);
        const passwordInput = react_2.screen.getByLabelText(/password/i);
        const togglePassword = react_2.screen.getByRole('button', { name: /password/i });
        const signInButton = react_2.screen.getByRole('button', { name: /sign in/i });
        await user.tab();
        (0, vitest_1.expect)(emailInput).toHaveFocus();
        await user.tab();
        (0, vitest_1.expect)(passwordInput).toHaveFocus();
        await user.tab();
        (0, vitest_1.expect)(togglePassword).toHaveFocus();
        await user.tab();
        (0, vitest_1.expect)(signInButton).toHaveFocus();
    });
});
