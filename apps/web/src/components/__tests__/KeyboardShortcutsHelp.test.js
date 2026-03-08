"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const KeyboardShortcutsHelp_1 = require("../KeyboardShortcutsHelp");
const vitest_1 = require("vitest");
// Mock the context hook
const { mockUseKeyboardShortcuts } = vitest_1.vi.hoisted(() => {
    return {
        mockUseKeyboardShortcuts: vitest_1.vi.fn(),
    };
});
vitest_1.vi.mock('@/contexts/KeyboardShortcutsContext', () => ({
    useKeyboardShortcuts: mockUseKeyboardShortcuts,
}));
// Mock UI components to avoid Radix UI issues in test environment
vitest_1.vi.mock('@/components/ui/Dialog', () => ({
    Dialog: ({ open, children }) => (open ? <div data-testid="dialog">{children}</div> : null),
    DialogContent: ({ children }) => (<div data-testid="dialog-content">{children}</div>),
    DialogHeader: ({ children }) => (<div data-testid="dialog-header">{children}</div>),
    DialogTitle: ({ children }) => (<div role="heading">{children}</div>),
}));
describe('KeyboardShortcutsHelp', () => {
    beforeEach(() => {
        mockUseKeyboardShortcuts.mockReturnValue({
            isHelpOpen: true,
            closeHelp: vitest_1.vi.fn(),
            shortcuts: [
                {
                    id: 'test-shortcut-1',
                    keys: ['mod+k'],
                    description: 'Open Command Palette',
                    category: 'Navigation',
                    action: vitest_1.vi.fn(),
                },
                {
                    id: 'test-shortcut-2',
                    keys: ['shift+?'],
                    description: 'Show Help',
                    category: 'General',
                    action: vitest_1.vi.fn(),
                },
            ],
        });
    });
    it('renders help dialog with shortcuts', () => {
        (0, react_2.render)(<KeyboardShortcutsHelp_1.KeyboardShortcutsHelp />);
        // Check if the dialog title is present
        expect(react_2.screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
        // Check if the shortcuts are rendered
        expect(react_2.screen.getByText('Open Command Palette')).toBeInTheDocument();
        expect(react_2.screen.getByText('Show Help')).toBeInTheDocument();
    });
    it('renders accessible labels for key badges', () => {
        (0, react_2.render)(<KeyboardShortcutsHelp_1.KeyboardShortcutsHelp />);
        // Initially, these should fail because aria-labels are missing
        const commandBadges = react_2.screen.getAllByLabelText('Command');
        expect(commandBadges.length).toBeGreaterThan(0);
        const shiftBadges = react_2.screen.getAllByLabelText('Shift');
        expect(shiftBadges.length).toBeGreaterThan(0);
    });
    it('renders accessible labels for footer badges', () => {
        (0, react_2.render)(<KeyboardShortcutsHelp_1.KeyboardShortcutsHelp />);
        // Footer has '?' badge
        const questionMarkBadge = react_2.screen.getByLabelText('Question mark');
        expect(questionMarkBadge).toBeInTheDocument();
        // Footer has 'K' badge
        const kBadge = react_2.screen.getByLabelText('K');
        expect(kBadge).toBeInTheDocument();
    });
});
