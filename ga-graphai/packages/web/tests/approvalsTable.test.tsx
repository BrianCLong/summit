import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ApprovalsTable } from "../src/components/approvals/ApprovalsTable.js";
import { Approval } from "../src/api/types.js";

describe("ApprovalsTable", () => {
  const approvals: Approval[] = [
    {
      id: "1",
      operation: "grant_elevated_access",
      requesterId: "alice",
      target: { userId: "bob", tenantId: "acme" },
      attributes: {},
      status: "PENDING",
      createdAt: new Date("2024-04-01T10:00:00Z").toISOString(),
    },
    {
      id: "2",
      operation: "remove_access",
      requesterId: "carol",
      target: { userId: "dave", tenantId: "acme", role: "viewer" },
      attributes: {},
      status: "APPROVED",
      createdAt: new Date("2024-04-02T10:00:00Z").toISOString(),
    },
  ];

  it("renders rows and emits sort change", async () => {
    const onSortChange = vi.fn();
    render(
      <ApprovalsTable
        approvals={approvals}
        total={2}
        page={0}
        pageSize={20}
        sortBy="createdAt"
        sortDirection="desc"
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
        onSelect={() => undefined}
        onSortChange={onSortChange}
      />
    );

    expect(screen.getAllByRole("row")).toHaveLength(approvals.length + 1);
    await userEvent.click(screen.getByRole("button", { name: /Requester/i }));
    expect(onSortChange).toHaveBeenCalledWith("requesterId");
    expect(screen.queryByRole("button", { name: /Target user/i })).not.toBeInTheDocument();
  });

  it("clamps pagination controls and exposes page size changes", async () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <ApprovalsTable
        approvals={approvals}
        total={25}
        page={2}
        pageSize={10}
        sortBy="createdAt"
        sortDirection="asc"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onSelect={() => undefined}
        onSortChange={() => undefined}
      />
    );

    const next = screen.getByRole("button", { name: /Next/ });
    expect(next).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /First/ }));
    expect(onPageChange).toHaveBeenCalledWith(0);

    await userEvent.selectOptions(screen.getByLabelText(/Rows per page/), "50");
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it("shows skeleton rows while loading an empty page", () => {
    render(
      <ApprovalsTable
        approvals={[]}
        total={0}
        page={0}
        pageSize={20}
        sortBy="createdAt"
        sortDirection="desc"
        isLoading
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
        onSelect={() => undefined}
        onSortChange={() => undefined}
      />
    );

    // header row + placeholder skeleton rows
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
  });
});
