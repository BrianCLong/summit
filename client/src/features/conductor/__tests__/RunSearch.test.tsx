import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RunSearch from "../RunSearch";
import { useAuthorization } from "../../../auth/withAuthorization";

jest.mock("../../../auth/withAuthorization");

const mockedUseAuthorization = useAuthorization as jest.MockedFunction<typeof useAuthorization>;
const originalFetch = global.fetch;

describe("RunSearch", () => {
  beforeEach(() => {
    mockedUseAuthorization.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("issues a tenant-scoped search when authorized", async () => {
    mockedUseAuthorization.mockReturnValue({
      canAccess: jest.fn().mockReturnValue(true),
      tenant: "tenant-scope",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const mockFetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ data: { searchRuns: [] } }),
      } as Response)
    );
    global.fetch = mockFetch as typeof global.fetch;

    render(<RunSearch />);

    fireEvent.click(screen.getByTestId("run-search-submit"));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstCall = (mockFetch as any).mock.calls[0];
    const requestInit = firstCall[1];
    const body = JSON.parse(requestInit.body as string);
    expect(body.query).toContain('"tenant":"tenant-scope"');
  });

  it("blocks search and shows message when unauthorized", async () => {
    mockedUseAuthorization.mockReturnValue({
      canAccess: jest.fn().mockReturnValue(false),
      tenant: "tenant-scope",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const mockFetch = jest.fn();
    global.fetch = mockFetch as typeof global.fetch;

    render(<RunSearch />);

    fireEvent.click(screen.getByTestId("run-search-submit"));

    expect(screen.getByTestId("run-search-denied")).toBeInTheDocument();
    await waitFor(() => expect(mockFetch).not.toHaveBeenCalled());
  });
});
