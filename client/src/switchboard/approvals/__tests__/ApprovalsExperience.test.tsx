import { act } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as hooks from "../hooks";
import ApprovalsExperience from "../ApprovalsExperience";

const baseApproval = {
  id: "ap-123",
  requester_id: "analyst.ops",
  approver_id: null,
  action: "quarantine-segment",
  status: "pending",
  reason: "Segment needs isolation while we inspect traffic spikes.",
  run_id: "run-99",
  created_at: "2024-07-01T12:00:00.000Z",
  approvalsRequired: 2,
  approvalsCompleted: 1,
  requiresDualControl: true,
  claims: ["approval:review", "approval:dual-control"],
  auditTrail: [
    {
      id: "evt-1",
      kind: "preflight",
      actor: "system",
      message: "Preflight checks completed",
      at: "2024-07-01T11:59:00.000Z",
      status: "success",
    },
    {
      id: "evt-2",
      kind: "approval",
      actor: "analyst.ops",
      message: "Approval requested",
      at: "2024-07-01T12:00:00.000Z",
      status: "info",
    },
    {
      id: "evt-3",
      kind: "execution",
      actor: "orchestrator",
      message: "Execution pending approvals",
      at: "2024-07-01T12:01:00.000Z",
      status: "warning",
    },
    {
      id: "evt-4",
      kind: "receipt",
      actor: "audit-ledger",
      message: "Receipt will be emitted after execution",
      at: "2024-07-01T12:02:00.000Z",
      status: "info",
    },
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockResponse = (body: any, ok = true) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status: ok ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    })
  );

const buildFetch = (claims: string[], approvals = [baseApproval]) =>
  jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input === "/graphql") {
      const body = JSON.parse(String(init?.body || "{}"));
      const query: string = body.query || "";
      if (query.includes("Claims")) {
        return mockResponse({ data: { viewer: { claims } } });
      }
      if (query.includes("Approval(")) {
        return mockResponse({ data: { approval: approvals[0] } });
      }
      return mockResponse({ data: { approvals } });
    }
    if (
      typeof input === "string" &&
      input.startsWith("/api/approvals/") &&
      input.includes("/approve")
    ) {
      return mockResponse({ status: "awaiting_second", approvalsCompleted: 1 });
    }
    return mockResponse({ data: approvals });
  });

describe("ApprovalsExperience", () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("renders approvals, timeline, and supports dual-control messaging", async () => {
    jest
      .spyOn(hooks, "submitDecision")
      .mockResolvedValue({ status: "awaiting_second", approvalsCompleted: 1 });
    global.fetch = buildFetch(["approval:review", "approval:dual-control"]);

    render(<ApprovalsExperience />);

    const rows = await screen.findAllByRole("button", {
      name: /quarantine-segment/i,
    });
    expect(rows[0]).toBeInTheDocument();
    expect(await screen.findByText(/Approval requested/i)).toBeInTheDocument();

    await act(async () => {
      await userEvent.type(
        screen.getByLabelText(/rationale/i),
        "Investigated traffic spike - safe to isolate."
      );
      await userEvent.click(screen.getByRole("button", { name: /approve/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Dual-control enforced: awaiting co-signer/i)).toBeInTheDocument();
    });
  });

  it("guards the view when ABAC claim is missing", async () => {
    jest.spyOn(hooks, "useAbacClaims").mockReturnValue({
      claims: ["unrelated:claim"],
      loading: false,
      allowed: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    global.fetch = buildFetch(["unrelated:claim"], []);

    render(<ApprovalsExperience />);

    expect(await screen.findByText(/missing the required ABAC claims/i)).toBeInTheDocument();
  });
});
