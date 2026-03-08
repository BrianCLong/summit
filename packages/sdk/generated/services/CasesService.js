"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CasesService = void 0;
const OpenAPI_1 = require("../core/OpenAPI");
const request_1 = require("../core/request");
class CasesService {
    /**
     * Create investigation case
     * Creates a new investigation case in draft status
     * @param requestBody
     * @returns any Case created
     * @throws ApiError
     */
    static postCases(requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'POST',
            url: '/cases',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Authentication required or invalid token`,
                403: `Insufficient permissions`,
            },
        });
    }
    /**
     * Get case details
     * Retrieve a case by ID
     * @param caseId
     * @returns any Case details
     * @throws ApiError
     */
    static getCases(caseId) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/cases/{caseId}',
            path: {
                'caseId': caseId,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Approve case
     * Updates case status to approved and records audit entry
     * @param caseId
     * @returns any Case approved
     * @throws ApiError
     */
    static postCasesApprove(caseId) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'POST',
            url: '/cases/{caseId}/approve',
            path: {
                'caseId': caseId,
            },
            errors: {
                403: `Insufficient permissions`,
                404: `Resource not found`,
            },
        });
    }
    /**
     * Export case bundle
     * Exports case data including evidence references and watermark metadata
     * @param caseId
     * @returns CaseExport Case export bundle
     * @throws ApiError
     */
    static getCasesExport(caseId) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/cases/{caseId}/export',
            path: {
                'caseId': caseId,
            },
            errors: {
                403: `Insufficient permissions`,
                404: `Resource not found`,
            },
        });
    }
}
exports.CasesService = CasesService;
