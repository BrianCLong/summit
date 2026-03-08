"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const react_2 = require("react");
const useRestoreFocus_1 = __importDefault(require("./useRestoreFocus"));
function TestModal({ open }) {
    (0, useRestoreFocus_1.default)(open);
    if (!open) {
        return null;
    }
    return (<div role="dialog" aria-label="Mock modal">
      <button type="button">Inside modal</button>
    </div>);
}
function TestHarness() {
    const [open, setOpen] = (0, react_2.useState)(false);
    return (<div>
      <button type="button" onClick={() => setOpen(true)}>
        Open modal
      </button>
      <button type="button">Second control</button>
      <TestModal open={open}/>
      {open && (<button type="button" onClick={() => setOpen(false)}>
          Close modal
        </button>)}
    </div>);
}
describe('useRestoreFocus', () => {
    it('restores focus to the trigger element after a modal closes', async () => {
        const user = user_event_1.default.setup();
        (0, react_1.render)(<TestHarness />);
        const openButton = react_1.screen.getByRole('button', { name: /open modal/i });
        await user.click(openButton);
        expect(react_1.screen.getByRole('button', { name: /inside modal/i })).toBeInTheDocument();
        await user.click(react_1.screen.getByRole('button', { name: /close modal/i }));
        expect(openButton).toHaveFocus();
    });
    function FallbackHarness() {
        const [open, setOpen] = (0, react_2.useState)(true);
        const fallbackRef = (0, react_2.useRef)(null);
        (0, useRestoreFocus_1.default)(open, { fallbackRef });
        return (<div>
        <button type="button" ref={fallbackRef}>
          Fallback control
        </button>
        {open && (<div role="dialog" aria-label="Fallback modal">
            <button type="button" onClick={() => setOpen(false)}>
              Close immediately
            </button>
          </div>)}
      </div>);
    }
    it('falls back to the configured control when no trigger focus is stored', async () => {
        const user = user_event_1.default.setup();
        (0, react_1.render)(<FallbackHarness />);
        await user.click(react_1.screen.getByRole('button', { name: /close immediately/i }));
        expect(react_1.screen.getByRole('button', { name: /fallback control/i })).toHaveFocus();
    });
});
