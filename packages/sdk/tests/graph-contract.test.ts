import { IntelGraphCoreClient, type GraphExportRequest } from "../src/generated";
import insightsFixture from "./fixtures/graph-insights.json";
import exportAccepted from "./fixtures/graph-export-accepted.json";
import exportStatus from "./fixtures/graph-export-status.json";

describe("IntelGraph core SDK contracts", () => {
  const baseUrl = "https://api.contracts.intelgraph.test";
  let client: IntelGraphCoreClient;

  beforeEach(() => {
    jest.restoreAllMocks();
    client = new IntelGraphCoreClient({ BASE: baseUrl, TOKEN: "contract-token" });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("parses graph insight responses according to the OpenAPI contract", async () => {
    const fetchMock = jest
      .spyOn(globalThis as unknown as typeof globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(insightsFixture), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }) as unknown as Response
      );

    const result = await client.graphAnalytics.getGraphsInsights({
      graphId: insightsFixture.graphId,
      limit: 5,
      severity: "high",
    });

    expect(result).toEqual(insightsFixture);
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/graphs/${insightsFixture.graphId}/insights?limit=5&severity=high`,
      expect.objectContaining({ method: "GET", headers: expect.any(Headers) })
    );
  });

  it("submits export jobs and maps status payloads from fixtures", async () => {
    const fetchMock = jest.spyOn(globalThis as unknown as typeof globalThis, "fetch");

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(exportAccepted), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }) as unknown as Response
    );

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(exportStatus), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }) as unknown as Response
    );

    const exportRequest: GraphExportRequest = {
      format: exportAccepted.format as GraphExportRequest["format"],
      includeProperties: true,
      filters: exportAccepted.filters,
      notificationEmail: "ops@intelgraph.ai",
    };

    const acceptedJob = await client.graphAnalytics.postGraphsExports({
      graphId: exportAccepted.graphId,
      requestBody: exportRequest,
    });

    expect(acceptedJob).toEqual(exportAccepted);
    const [postUrl, postInit] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(postUrl).toBe(`${baseUrl}/graphs/${exportAccepted.graphId}/exports`);
    expect(postInit).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(exportRequest),
        headers: expect.any(Headers),
      })
    );

    const statusResponse = await client.graphAnalytics.getGraphsExports({
      graphId: exportStatus.graphId,
      exportId: exportStatus.exportId,
    });

    expect(statusResponse).toEqual(exportStatus);
    const [statusUrl, statusInit] = fetchMock.mock.calls[1] as [RequestInfo | URL, RequestInit];
    expect(statusUrl).toBe(
      `${baseUrl}/graphs/${exportStatus.graphId}/exports/${exportStatus.exportId}`
    );
    expect(statusInit).toEqual(
      expect.objectContaining({ method: "GET", headers: expect.any(Headers) })
    );
  });
});
