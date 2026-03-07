import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthorizationGate, useAuthorization } from "./withAuthorization";

const mockUseAuth = jest.fn();

jest.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("withAuthorization / AuthorizationGate", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("renders children when the action and tenant are permitted", () => {
    mockUseAuth.mockReturnValue({
      user: {
        role: "ANALYST",
        tenants: ["tenant-a"],
        permissions: ["read_graph"],
      },
      loading: false,
      hasRole: jest.fn(),
      hasPermission: jest.fn(),
    });

    render(
      <AuthorizationGate action="actions:read" tenantId="tenant-a">
        <div>allowed-content</div>
      </AuthorizationGate>
    );

    expect(screen.getByText("allowed-content")).toBeInTheDocument();
  });

  it("blocks rendering when the tenant scope is not authorized", () => {
    mockUseAuth.mockReturnValue({
      user: {
        role: "ANALYST",
        tenants: ["tenant-a"],
        permissions: ["read_graph"],
      },
      loading: false,
      hasRole: jest.fn(),
      hasPermission: jest.fn(),
    });

    render(<AuthorizationGate action="actions:read" tenantId="tenant-b" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Access denied");
  });
});

describe("useAuthorization helpers", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({
      user: {
        role: "OPERATOR",
        tenants: ["alpha"],
        permissions: ["actions:read"],
      },
      loading: false,
      hasRole: jest.fn(),
      hasPermission: jest.fn(),
    });
  });

  const FilterProbe = () => {
    const { filterByAccess } = useAuthorization("alpha");
    const actions = [
      { id: "a", policy: "actions:read" },
      { id: "b", policy: "actions:write" },
    ];
    const visible = filterByAccess(actions, (action) => ({
      action: action.policy,
      tenantId: "alpha",
    }));

    return (
      <div>
        {visible.map((action) => (
          <span key={action.id}>{action.id}</span>
        ))}
      </div>
    );
  };

  it("filters out unauthorized actions", () => {
    render(<FilterProbe />);

    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.queryByText("b")).not.toBeInTheDocument();
  });
});
