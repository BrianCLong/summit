"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.growthPlaybookService = exports.GrowthPlaybookService = void 0;
// @ts-nocheck
const LLMService_js_1 = __importDefault(require("./LLMService.js"));
class GrowthPlaybookService {
    llm;
    constructor() {
        this.llm = new LLMService_js_1.default({
            provider: process.env.LLM_PROVIDER || 'mock', // Default to mock if not set
            model: 'gpt-4'
        });
    }
    async generatePlaybook(profile) {
        const prompt = `
      You are an expert business coach specializing in EOS and Scaling Up frameworks.
      Analyze the following company profile and generate a customized growth playbook.

      Company Name: ${profile.name}
      Industry: ${profile.industry}
      Stage: ${profile.stage}
      Employees: ${profile.employees}
      Revenue: $${profile.revenue}
      Challenges: ${profile.challenges.join(', ')}
      Goals: ${profile.goals.join(', ')}

      Output JSON format:
      {
        "title": "Growth Playbook for [Company Name]",
        "summary": "Executive summary...",
        "score": [0-100 assessment score],
        "strengths": ["List of strengths"],
        "weaknesses": ["List of weaknesses"],
        "strategic_initiatives": [
          { "title": "...", "description": "...", "timeline": "..." }
        ],
        "tactical_actions": ["Action 1", "Action 2", ...]
      }
    `;
        try {
            const response = await this.llm.complete(prompt, {
                temperature: 0.7,
                maxTokens: 1500
            });
            // Handle object response from LLMService (which returns { content, usage })
            // or direct string if legacy provider
            const content = typeof response === 'object' && response.content
                ? response.content
                : response;
            // Parse JSON from response (handle potential markdown code blocks)
            const cleanJson = content.replace(/```json\n?|\n?```/g, '');
            return JSON.parse(cleanJson);
        }
        catch (error) {
            console.error('Error generating playbook:', error);
            throw new Error('Failed to generate growth playbook');
        }
    }
}
exports.GrowthPlaybookService = GrowthPlaybookService;
exports.growthPlaybookService = new GrowthPlaybookService();
