/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Case } from '../models/Case';
import type { CaseExport } from '../models/CaseExport';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CasesService {
    /**
     * Create investigation case
     * Creates a new investigation case in draft status
     * @param requestBody
     * @returns any Case created
     * @throws ApiError
     */
    public static postCases(
        requestBody: {
            title: string;
        },
    ): CancelablePromise<{
        ok?: boolean;
        case?: Case;
    }> {
        return __request(OpenAPI, {
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
    public static getCases(
        caseId: string,
    ): CancelablePromise<{
        ok?: boolean;
        case?: Case;
    }> {
        return __request(OpenAPI, {
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
    public static postCasesApprove(
        caseId: string,
    ): CancelablePromise<{
        ok?: boolean;
        case?: Case;
    }> {
        return __request(OpenAPI, {
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
    public static getCasesExport(
        caseId: string,
    ): CancelablePromise<CaseExport> {
        return __request(OpenAPI, {
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
