import { SummitCallbackHandler } from "../src/SummitCallbackHandler";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("SummitCallbackHandler", () => {
    const config = {
        apiUrl: "http://localhost:3000",
        agentId: "agent-123",
        apiKey: "test-key",
        tenantId: "tenant-1"
    };

    const handler = new SummitCallbackHandler(config);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should allow execution if governance policy passes", async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: { allowed: true } });

        await expect(
            handler.handleToolStart(
                { id: ["langchain", "tools", "Calculator"] },
                "test input",
                "run-1"
            )
        ).resolves.toBeUndefined();

        expect(mockedAxios.post).toHaveBeenCalledWith(
            `${config.apiUrl}/api/v4/ai-governance/policy/evaluate`,
            expect.objectContaining({
                agentId: config.agentId,
                toolName: "Calculator",
                toolInput: "test input"
            }),
            expect.any(Object)
        );
    });

    it("should block execution and throw error on 403", async () => {
        mockedAxios.post.mockRejectedValueOnce({
            response: { status: 403 }
        });

        await expect(
            handler.handleToolStart({ id: ["Tool"] }, "input", "run-1")
        ).rejects.toThrow("Execution blocked due to policy failure (403 Forbidden)");
    });

    it("should block execution on allowed: false", async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { allowed: false, reason: "Unauthorized tool" }
        });

        await expect(
            handler.handleToolStart({ id: ["Tool"] }, "input", "run-1")
        ).rejects.toThrow("Unauthorized tool");
    });
});
