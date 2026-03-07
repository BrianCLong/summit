import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import useRestoreFocus from "./useRestoreFocus";

function TestModal({ open }: { open: boolean }) {
  useRestoreFocus(open);

  if (!open) {
    return null;
  }

  return (
    <div role="dialog" aria-label="Mock modal">
      <button type="button">Inside modal</button>
    </div>
  );
}

function TestHarness() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open modal
      </button>
      <button type="button">Second control</button>
      <TestModal open={open} />
      {open && (
        <button type="button" onClick={() => setOpen(false)}>
          Close modal
        </button>
      )}
    </div>
  );
}

describe("useRestoreFocus", () => {
  it("restores focus to the trigger element after a modal closes", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    const openButton = screen.getByRole("button", { name: /open modal/i });
    await user.click(openButton);

    expect(screen.getByRole("button", { name: /inside modal/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close modal/i }));

    expect(openButton).toHaveFocus();
  });

  function FallbackHarness() {
    const [open, setOpen] = useState(true);
    const fallbackRef = useRef<HTMLButtonElement>(null);
    useRestoreFocus(open, { fallbackRef });

    return (
      <div>
        <button type="button" ref={fallbackRef}>
          Fallback control
        </button>
        {open && (
          <div role="dialog" aria-label="Fallback modal">
            <button type="button" onClick={() => setOpen(false)}>
              Close immediately
            </button>
          </div>
        )}
      </div>
    );
  }

  it("falls back to the configured control when no trigger focus is stored", async () => {
    const user = userEvent.setup();
    render(<FallbackHarness />);

    await user.click(screen.getByRole("button", { name: /close immediately/i }));

    expect(screen.getByRole("button", { name: /fallback control/i })).toHaveFocus();
  });
});
