/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AuditEvent } from '../models/AuditEvent';
import type { FeatureFlag } from '../models/FeatureFlag';
import type { Tenant } from '../models/Tenant';
import type { User } from '../models/User';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdminService {
    /**
     * List tenants
     * Returns all tenants (admin only)
     * @returns any Tenants returned
     * @throws ApiError
     */
    public static getAdminTenants(): CancelablePromise<{
        items?: Array<Tenant>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/tenants',
        });
    }
    /**
     * List users
     * Returns all users (admin only)
     * @returns any Users returned
     * @throws ApiError
     */
    public static getAdminUsers(): CancelablePromise<{
        items?: Array<User>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/users',
        });
    }
    /**
     * Query audit events
     * Returns audit events filtered by optional query and limit
     * @param limit
     * @param query
     * @returns any Audit log entries
     * @throws ApiError
     */
    public static getAdminAudit(
        limit: number = 200,
        query?: string,
    ): CancelablePromise<{
        items?: Array<AuditEvent>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/audit',
            query: {
                'limit': limit,
                'query': query,
            },
        });
    }
    /**
     * Record external audit event
     * Records an external audit event using signed headers
     * @param xAuditToken
     * @param xAuditNonce
     * @param xAuditTs
     * @param requestBody
     * @returns any Event recorded
     * @throws ApiError
     */
    public static postAdminAuditRecord(
        xAuditToken: string,
        xAuditNonce: string,
        xAuditTs: number,
        requestBody: {
            action?: string;
            details?: Record<string, any>;
        },
    ): CancelablePromise<{
        ok?: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/admin/audit/record',
            headers: {
                'x-audit-token': xAuditToken,
                'x-audit-nonce': xAuditNonce,
                'x-audit-ts': xAuditTs,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Stale timestamp or missing nonce`,
                401: `Invalid audit token`,
                409: `Replay detected`,
            },
        });
    }
    /**
     * Get feature flags
     * Returns current feature flag settings
     * @returns any Feature flags
     * @throws ApiError
     */
    public static getAdminFlags(): CancelablePromise<{
        flags?: FeatureFlag;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/flags',
        });
    }
    /**
     * Update feature flag
     * Sets a feature flag value
     * @param key
     * @param requestBody
     * @returns any Flag updated
     * @throws ApiError
     */
    public static putAdminFlags(
        key: string,
        requestBody: {
            value?: boolean;
        },
    ): CancelablePromise<{
        ok?: boolean;
        key?: string;
        value?: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/admin/flags/{key}',
            path: {
                'key': key,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get OPA policy
     * Returns the current Rego policy (development only)
     * @returns string Policy returned
     * @throws ApiError
     */
    public static getAdminPolicy(): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/policy',
        });
    }
    /**
     * Update OPA policy
     * Updates the Rego policy source (development only)
     * @param requestBody
     * @returns any Policy updated
     * @throws ApiError
     */
    public static putAdminPolicy(
        requestBody: {
            content?: string;
        },
    ): CancelablePromise<{
        ok?: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/admin/policy',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
