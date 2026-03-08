"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaestroLLMService = void 0;
const LLMRouter_js_1 = require("./LLMRouter.js");
const llm_router_config_js_1 = require("../../config/llm-router.config.js");
class MaestroLLMService {
    router;
    static instance;
    constructor() {
        this.router = new LLMRouter_js_1.LLMRouter(llm_router_config_js_1.llmRouterConfig);
    }
    static getInstance() {
        if (!MaestroLLMService.instance) {
            MaestroLLMService.instance = new MaestroLLMService();
        }
        return MaestroLLMService.instance;
    }
    async executeTaskLLM(params) {
        const request = {
            taskType: params.taskType,
            prompt: params.prompt,
            messages: params.messages,
            context: params.context,
            runId: params.runId,
            tenantId: params.tenantId,
            metadata: params.metadata
        };
        return this.router.execute(request);
    }
}
exports.MaestroLLMService = MaestroLLMService;
