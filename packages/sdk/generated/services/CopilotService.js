"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotService = void 0;
const OpenAPI_1 = require("../core/OpenAPI");
const request_1 = require("../core/request");
class CopilotService {
    /**
     * Estimate prompt cost
     * Estimates resource cost for a natural language prompt
     * @param requestBody
     * @returns CostEstimate Cost estimate
     * @throws ApiError
     */
    static postCopilotEstimate(requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'POST',
            url: '/copilot/estimate',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Classify prompt safety
     * Flags policy-violating content in prompts
     * @param requestBody
     * @returns SafetyClassification Classification result
     * @throws ApiError
     */
    static postCopilotClassify(requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'POST',
            url: '/copilot/classify',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Retrieve query templates
     * Returns reusable query templates for common tasks
     * @param requestBody
     * @returns any Templates returned
     * @throws ApiError
     */
    static postCopilotCookbook(requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'POST',
            url: '/copilot/cookbook',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
exports.CopilotService = CopilotService;
