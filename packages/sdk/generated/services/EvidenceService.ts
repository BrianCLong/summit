/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Annotation } from '../models/Annotation';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class EvidenceService {
    /**
     * List evidence annotations
     * Retrieve annotations attached to a piece of evidence
     * @param evidenceId
     * @returns any Annotation list
     * @throws ApiError
     */
    public static getEvidenceAnnotations(
        evidenceId: string,
    ): CancelablePromise<{
        items?: Array<Annotation>;
    }> {
        return __request(OpenAPI, {
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
    public static postEvidenceAnnotations(
        evidenceId: string,
        requestBody: {
            range: string;
            note: string;
        },
    ): CancelablePromise<{
        ok?: boolean;
        annotation?: Annotation;
    }> {
        return __request(OpenAPI, {
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
    public static getEvidencePdf(
        evidenceId: string,
    ): CancelablePromise<{
        ok?: boolean;
        url?: string;
    }> {
        return __request(OpenAPI, {
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
