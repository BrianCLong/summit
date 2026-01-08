import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CommandPalette from "../CommandPalette";
import { __resetCommandRegistryForTests, registerCommand } from "../commandRegistry";

describe("CommandPalette", () => {
  beforeEach(() => {
    __resetCommandRegistryForTests();
  });

  test("opens and closes via controls", () => {
    const unregister = registerCommand({
      id: "demo",
      title: "Demo command",
      description: "Does a thing",
      action: () => {},
    });

    const onClose = jest.fn();
    render(<CommandPalette open onClose={onClose} />);

    expect(screen.getByLabelText(/Command palette search/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Close command palette/i));
    expect(onClose).toHaveBeenCalled();

    unregister();
  });

  test("filters commands via fuzzy search", () => {
    registerCommand({
      id: "graph",
      title: "Open graph explorer",
      description: "Jump to the graph",
      action: () => {},
    });
    registerCommand({
      id: "settings",
      title: "Open settings",
      description: "Admin settings",
      action: () => {},
    });

    render(<CommandPalette open onClose={() => {}} />);

    const input = screen.getByLabelText(/Command palette search/i);
    fireEvent.change(input, { target: { value: "graph" } });

    expect(screen.getByText(/Open graph explorer/)).toBeInTheDocument();
    expect(screen.queryByText(/Open settings/)).not.toBeInTheDocument();
  });

  test("supports keyboard selection with enter", () => {
    const action = jest.fn();
    registerCommand({
      id: "case",
      title: "Open case workspace",
      description: "Navigate to cases",
      action,
    });

    render(<CommandPalette open onClose={() => {}} />);

    const search = screen.getByLabelText(/Command palette search/i);
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });

    expect(action).toHaveBeenCalledTimes(1);
  });
});
