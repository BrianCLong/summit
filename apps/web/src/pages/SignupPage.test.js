"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const react_router_dom_1 = require("react-router-dom");
const vitest_1 = require("vitest");
const SignupPage_1 = __importDefault(require("./SignupPage"));
(0, vitest_1.describe)('SignupPage', () => {
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)('renders sign up form correctly', () => {
        (0, react_1.render)(<react_router_dom_1.MemoryRouter>
        <SignupPage_1.default />
      </react_router_dom_1.MemoryRouter>);
        (0, vitest_1.expect)(react_1.screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByLabelText(/first name/i)).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByLabelText(/email/i)).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByLabelText(/^password/i)).toBeInTheDocument();
    });
    (0, vitest_1.it)('toggles password visibility', () => {
        (0, react_1.render)(<react_router_dom_1.MemoryRouter>
        <SignupPage_1.default />
      </react_router_dom_1.MemoryRouter>);
        const passwordInput = react_1.screen.getByLabelText(/^password/i);
        (0, vitest_1.expect)(passwordInput).toHaveAttribute('type', 'password');
        // Find toggle button - initially it should be 'Show password'
        // This will fail initially because there is no aria-label
        const toggleButton = react_1.screen.getByRole('button', { name: /show password/i });
        react_1.fireEvent.click(toggleButton);
        (0, vitest_1.expect)(passwordInput).toHaveAttribute('type', 'text');
        (0, vitest_1.expect)(toggleButton).toHaveAccessibleName(/hide password/i);
        react_1.fireEvent.click(toggleButton);
        (0, vitest_1.expect)(passwordInput).toHaveAttribute('type', 'password');
        (0, vitest_1.expect)(toggleButton).toHaveAccessibleName(/show password/i);
    });
    (0, vitest_1.it)('shows loading state on submit', async () => {
        global.fetch = vitest_1.vi.fn().mockImplementation(() => new Promise(() => { })); // pending promise
        (0, react_1.render)(<react_router_dom_1.MemoryRouter>
        <SignupPage_1.default />
      </react_router_dom_1.MemoryRouter>);
        react_1.fireEvent.change(react_1.screen.getByLabelText(/first name/i), { target: { value: 'Test' } });
        react_1.fireEvent.change(react_1.screen.getByLabelText(/last name/i), { target: { value: 'User' } });
        react_1.fireEvent.change(react_1.screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
        react_1.fireEvent.change(react_1.screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        react_1.fireEvent.change(react_1.screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
        const submitButton = react_1.screen.getByRole('button', { name: /create account/i });
        react_1.fireEvent.click(submitButton);
        // Wait for loading state
        // Currently implementation changes text to "Creating Account..."
        (0, vitest_1.expect)(await react_1.screen.findByRole('button', { name: /creating account/i })).toBeInTheDocument();
        // Button should be disabled (via aria-busy/disabled attribute check)
        (0, vitest_1.expect)(react_1.screen.getByRole('button', { name: /creating account/i })).toBeDisabled();
    });
});
