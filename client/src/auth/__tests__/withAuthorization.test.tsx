import React from "react";
import { render, screen } from "@testing-library/react";
import { withAuthorization } from "../withAuthorization";

jest.unmock("../withAuthorization");

jest.mock("../../context/AuthContext.jsx", () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = jest.requireMock("../../context/AuthContext.jsx");

describe("withAuthorization", () => {
  beforeEach(() => {
    useAuth.mockReset();
  });

  it("renders wrapped component when authorization passes", () => {
    useAuth.mockReturnValue({
      user: { role: "ANALYST", tenantId: "tenant-a" },
      loading: false,
      claims: [{ action: "graph:read", tenant: "tenant-a" }],
      canAccess: (action: string, tenant: string) =>
        action === "graph:read" && tenant === "tenant-a",
      tenantId: "tenant-a",
    });

    const Guarded = withAuthorization({ action: "graph:read" })(() => (
      <div data-testid="allowed">content</div>
    ));

    render(<Guarded />);
    expect(screen.getByTestId("allowed")).toBeInTheDocument();
  });

  it("blocks rendering when user lacks required claim", () => {
    useAuth.mockReturnValue({
      user: { role: "DENIED", tenantId: "tenant-b" },
      loading: false,
      canAccess: () => false,
      tenantId: "tenant-b",
    });

    const Guarded = withAuthorization({ action: "run:read" })(() => (
      <div data-testid="forbidden">content</div>
    ));

    render(<Guarded />);
    expect(screen.getByLabelText("access-denied")).toBeInTheDocument();
    expect(screen.queryByTestId("forbidden")).not.toBeInTheDocument();
  });
});
