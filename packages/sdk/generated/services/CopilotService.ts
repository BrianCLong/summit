/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CookbookQuery } from '../models/CookbookQuery';
import type { CostEstimate } from '../models/CostEstimate';
import type { SafetyClassification } from '../models/SafetyClassification';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CopilotService {
    /**
     * Estimate prompt cost
     * Estimates resource cost for a natural language prompt
     * @param requestBody
     * @returns CostEstimate Cost estimate
     * @throws ApiError
     */
    public static postCopilotEstimate(
        requestBody: {
            prompt?: string;
        },
    ): CancelablePromise<CostEstimate> {
        return __request(OpenAPI, {
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
    public static postCopilotClassify(
        requestBody: {
            prompt?: string;
        },
    ): CancelablePromise<SafetyClassification> {
        return __request(OpenAPI, {
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
    public static postCopilotCookbook(
        requestBody: {
            topic?: string;
        },
    ): CancelablePromise<{
        ok?: boolean;
        topic?: string;
        items?: Array<CookbookQuery>;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/copilot/cookbook',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
