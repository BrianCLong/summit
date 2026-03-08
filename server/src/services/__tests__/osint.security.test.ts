import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock fetch
const mockFetch = jest.fn();
// @ts-ignore
global.fetch = mockFetch;

// Mock dependencies relative to this test file
jest.unstable_mockModule("../OSINTQueueService.js", () => ({
  osintQueue: {
    getJobCounts: jest.fn(),
  },
}));

jest.unstable_mockModule("../../middleware/auth.js", () => ({
  ensureAuthenticated: (req: any, res: any, next: any) => next(),
}));

jest.unstable_mockModule("../../middleware/osintRateLimiter.js", () => ({
  osintRateLimiter: (req: any, res: any, next: any) => next(),
}));

jest.unstable_mockModule("../../db/postgres.js", () => ({
  getPostgresPool: jest.fn(),
}));

jest.unstable_mockModule(
  "../../../../packages/osint-collector/src/collectors/SimpleFeedCollector.js",
  () => ({
    SimpleFeedCollector: jest.fn(),
  })
);

jest.unstable_mockModule("../../../../packages/osint-collector/src/types/index.js", () => ({
  CollectionType: { WEB_SCRAPING: "WEB_SCRAPING" },
  TaskStatus: { PENDING: "PENDING" },
}));

jest.unstable_mockModule("../../audit/security-audit-logger.js", () => ({
  securityAudit: {
    logDataImport: jest.fn(),
    logSensitiveRead: jest.fn(),
  },
}));

describe("OSINT Routes Security", () => {
  let router: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ score: 0.1, summary: "Safe" }),
    });

    // Import router after mocks - dynamic import is key for unstable_mockModule
    const osintRouteModule = await import("../../routes/osint.js");
    router = osintRouteModule.default;
  });

  it("should use safe prompt structure for risk assessment", async () => {
    // Setup request
    const req = {
      method: "POST",
      url: "/assess-risk",
      body: {
        iocs: [{ value: "1.2.3.4" }],
      },
      user: { tenantId: "test-tenant" },
      get: () => "test-agent",
      ip: "127.0.0.1",
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    // Find handler
    // router is an express Router.
    // We need to find the layer that handles /assess-risk
    const handlerLayer = router.stack.find(
      (layer: any) => layer.route && layer.route.path === "/assess-risk"
    );
    if (!handlerLayer) {
      throw new Error("/assess-risk route not found in router stack");
    }
    // The route stack contains middlewares and the final handler.
    // ensureAuthenticated is first, the actual handler is likely last.
    const stack = handlerLayer.route.stack;
    const handler = stack[stack.length - 1].handle;

    // Set env var to enable LLM path
    process.env.LLM_ENDPOINT = "http://localhost:11434";

    await handler(req, res);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);

    // Verify prompt structure - specific assertions for the fix
    expect(body.prompt).toContain("Instructions:");
    expect(body.prompt).toContain('"""');
    expect(body.prompt).toContain("1.2.3.4");
    // Ensure delimiters surround the input
    expect(body.prompt).toMatch(/"""\s*1\.2\.3\.4\s*"""/);
  });
});
