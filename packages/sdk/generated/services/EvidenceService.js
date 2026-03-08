"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceService = void 0;
const OpenAPI_1 = require("../core/OpenAPI");
const request_1 = require("../core/request");
class EvidenceService {
    /**
     * List evidence annotations
     * Retrieve annotations attached to a piece of evidence
     * @param evidenceId
     * @returns any Annotation list
     * @throws ApiError
     */
    static getEvidenceAnnotations(evidenceId) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/evidence/{evidenceId}/annotations',
            path: {
                'evidenceId': evidenceId,
            },
            errors: {
                403: `Insufficient permissions`,
            },
        });
    }
    /**
     * Create evidence annotation
     * Adds a new annotation to the evidence item
     * @param evidenceId
     * @param requestBody
     * @returns any Annotation created
     * @throws ApiError
     */
    static postEvidenceAnnotations(evidenceId, requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'POST',
            url: '/evidence/{evidenceId}/annotations',
            path: {
                'evidenceId': evidenceId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                403: `Insufficient permissions`,
            },
        });
    }
    /**
     * Export evidence PDF
     * Generates a signed download URL for the evidence PDF
     * @param evidenceId
     * @returns any Export URL generated
     * @throws ApiError
     */
    static getEvidencePdf(evidenceId) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/evidence/{evidenceId}/pdf',
            path: {
                'evidenceId': evidenceId,
            },
            errors: {
                403: `Insufficient permissions`,
                404: `Resource not found`,
            },
        });
    }
}
exports.EvidenceService = EvidenceService;
