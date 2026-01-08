import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApprovalDetails } from "../ApprovalDetails";
import { approvalsData, demoUser } from "../mockData";

describe("ApprovalDetails", () => {
  it("blocks approval when ABAC denies", () => {
    const request = approvalsData[0];
    const user = { ...demoUser, tenants: ["other"] };
    const onDecision = vi.fn();

    render(<ApprovalDetails request={request} user={user} onDecision={onDecision} />);

    fireEvent.click(screen.getByText("Approve"));

    expect(onDecision).toHaveBeenCalled();
    const action = onDecision.mock.calls[0][0];
    expect(action.decision).toBe("denied");
    expect(action.rationale).toMatch(/tenant/i);
  });

  it("captures rationale and sets waiting status for dual control", () => {
    const request = approvalsData[0];
    const onDecision = vi.fn();

    render(<ApprovalDetails request={request} user={demoUser} onDecision={onDecision} />);

    fireEvent.change(screen.getByLabelText("rationale"), {
      target: { value: "Approving after review" },
    });
    fireEvent.click(screen.getByText("Approve"));

    expect(onDecision).toHaveBeenCalled();
    const action = onDecision.mock.calls[0][0] as any;
    expect(action.decision).toBe("approved");
    expect(action.statusOverride).toBe("waiting_dual");
    expect(action.rationale).toBe("Approving after review");
  });
});
