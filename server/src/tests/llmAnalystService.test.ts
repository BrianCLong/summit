import { jest } from "@jest/globals";
import LLMAnalystService from "../services/LLMAnalystService";

class MockLLMService {
  async complete() {
    return "mock-response";
  }
}

describe("LLMAnalystService", () => {
  it("creates products pending approval and allows approval", async () => {
    const service = new LLMAnalystService(new MockLLMService() as any);
    const result = await service.summarizeIntelligence(
      { nodes: [] },
      { threat: "test" },
    );

    expect(result.status).toBe("PENDING");
    expect(service.listPending()).toHaveLength(1);

    const approved = service.approveProduct(result.id);
    expect(approved.status).toBe("APPROVED");
  });
});
