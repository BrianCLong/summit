import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ApprovalsPage } from "../src/components/approvals/ApprovalsPage.js";

const makeResponse = (body: any) => ({
  ok: true,
  json: () => Promise.resolve(body),
});

describe("ApprovalsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests approvals with default sort and renders data", async () => {
    const sample = {
      items: [
        {
          id: "a-1",
          operation: "grant_elevated_access",
          requesterId: "alice",
          approverId: null,
          target: { userId: "bob", tenantId: "acme" },
          attributes: {},
          status: "PENDING",
          createdAt: new Date("2024-04-03T05:00:00Z").toISOString(),
        },
      ],
      total: 1,
      page: 0,
      pageSize: 20,
    };
    const fetchMock = vi.fn(() => Promise.resolve(makeResponse(sample)));
    vi.stubGlobal("fetch", fetchMock as any);

    render(<ApprovalsPage />);

    expect(await screen.findByText(/grant_elevated_access/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeEnabled();
    const firstCallUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(firstCallUrl).toContain("sortBy=createdAt");
    expect(firstCallUrl).toContain("sortDirection=desc");
  });

  it("surfaces errors with retry and empty guidance", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(makeResponse({ items: [], total: 0, page: 0, pageSize: 20 }));
    vi.stubGlobal("fetch", fetchMock as any);

    render(<ApprovalsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Error/);
    await userEvent.click(screen.getByRole("button", { name: /Retry/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/No approvals match your filters/)).toBeInTheDocument();
  });
});
