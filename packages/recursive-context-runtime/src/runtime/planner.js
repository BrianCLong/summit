"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimplePlanner = void 0;
class SimplePlanner {
    async execute(query, session) {
        // RLM Simulation:
        // 1. Root LM plans
        // 2. Worker LM executes (simulated via search)
        // 3. Root LM aggregates
        // Mocking the plan: "I need to search for relevant files"
        const plan = ["search_codebase"];
        let answer = "";
        for (const step of plan) {
            if (step === "search_codebase") {
                // "Worker LM" executes search
                // Use a heuristic to extract keywords from query for search
                // For MVP, just use the query string as is or split it
                const searchPattern = query.replace(/["']/g, ""); // basic sanitization
                const hits = await session.searchText(searchPattern, { maxHits: 5 });
                if (hits.length === 0) {
                    answer += "No direct matches found in codebase.\n";
                }
                else {
                    answer += `Found ${hits.length} relevant code snippets.\n`;
                    // "Worker LM" summarizes each hit
                    for (const hit of hits) {
                        const summary = this.mockSummarize(hit.hit);
                        answer += `- ${hit.span.path}: ${summary}\n`;
                    }
                }
            }
        }
        // Root LM Aggregation
        return `Analysis Result:\n${answer}`;
    }
    mockSummarize(text) {
        // Simulate summarization by taking first line or 100 chars
        return text.slice(0, 100).replace(/\n/g, " ") + "...";
    }
}
exports.SimplePlanner = SimplePlanner;
