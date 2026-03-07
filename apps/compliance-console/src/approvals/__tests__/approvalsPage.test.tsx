import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApprovalsPage } from "../ApprovalsPage";

describe("ApprovalsPage", () => {
  it("renders list and records approval with timeline update", () => {
    render(<ApprovalsPage />);

    const items = screen.getAllByText(/Enable switchboard dual routing/);
    expect(items.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("Approve"));

    expect(screen.getByText(/Approval recorded/)).toBeInTheDocument();
  });
});
