import React from "react";
import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ActionDetailsRoute from "../ActionDetailsRoute";

const mockUseAuth = jest.fn();

jest.mock("../../context/AuthContext.jsx", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("ActionDetailsRoute authorization", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseAuth.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("shows an access denied view when tenant scope is forbidden", () => {
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
    localStorage.setItem("tenantId", "tenant-b");

    render(
      <MemoryRouter initialEntries={["/actions/secure-action"]}>
        <Routes>
          <Route path="/actions/:actionId" element={<ActionDetailsRoute />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Access denied");
  });

  it("loads action details when tenant and action are permitted", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        role: "ANALYST",
        tenants: ["tenant-b"],
        permissions: ["read_graph"],
      },
      loading: false,
      hasRole: jest.fn(),
      hasPermission: jest.fn().mockReturnValue(true),
    });
    localStorage.setItem("tenantId", "tenant-b");

    render(
      <MemoryRouter initialEntries={["/actions/secure-action"]}>
        <Routes>
          <Route path="/actions/:actionId" element={<ActionDetailsRoute />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading action/i)).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/Action Safety Status/i)).toBeInTheDocument();
    expect(
      screen.getByText(/No specific threats detected for secure-action in tenant tenant-b/i)
    ).toBeInTheDocument();
  });
});
