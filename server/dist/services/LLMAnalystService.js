import { v4 as uuid } from "uuid";
import LLMService from "./LLMService.js";
/**
 * Prototype service where LLMs assist analysts with intelligence products.
 * Provides summarization, report generation and investigation suggestions
 * based on graph state and threat models. Every product requires explicit
 * analyst approval before it is considered final.
 */
export class LLMAnalystService {
    constructor(llmService = new LLMService()) {
        this.llm = llmService;
        this.products = new Map();
    }
    async generate(type, prompt) {
        const content = await this.llm.complete({
            prompt,
            maxTokens: 800,
            temperature: 0.2,
        });
        const product = {
            id: uuid(),
            type,
            content,
            status: "PENDING",
            createdAt: new Date().toISOString(),
        };
        this.products.set(product.id, product);
        return product;
    }
    /**
     * Summarize current intelligence graph.
     */
    async summarizeIntelligence(graphState, threatModel) {
        const prompt = `You are an intelligence analyst assistant. Summarize key insights from the following graph state and threat model in 3-4 bullet points.\n\nGraph State:\n${JSON.stringify(graphState)}\n\nThreat Model:\n${JSON.stringify(threatModel)}\n\nSummary:`;
        return this.generate("summary", prompt);
    }
    /**
     * Draft a full report with findings and actions.
     */
    async generateReport(graphState, threatModel) {
        const prompt = `You are an intelligence analyst assistant. Create a concise analytical report based on the graph state and threat model. Include findings and potential actions.\n\nGraph State:\n${JSON.stringify(graphState)}\n\nThreat Model:\n${JSON.stringify(threatModel)}\n\nReport:`;
        return this.generate("report", prompt);
    }
    /**
     * Recommend investigation paths for analysts.
     */
    async recommendInvestigationPaths(graphState, threatModel) {
        const prompt = `You are assisting investigators. Using the graph state and threat model, suggest the next best investigation paths with brief rationale.\n\nGraph State:\n${JSON.stringify(graphState)}\n\nThreat Model:\n${JSON.stringify(threatModel)}\n\nRecommendations:`;
        return this.generate("investigation", prompt);
    }
    /**
     * Mark a generated product as approved by an analyst.
     */
    approveProduct(id) {
        const product = this.products.get(id);
        if (!product)
            throw new Error("Product not found");
        product.status = "APPROVED";
        this.products.set(id, product);
        return product;
    }
    /**
     * List products awaiting analyst approval.
     */
    listPending() {
        return Array.from(this.products.values()).filter((p) => p.status === "PENDING");
    }
}
export const llmAnalystService = new LLMAnalystService();
export default LLMAnalystService;
//# sourceMappingURL=LLMAnalystService.js.map