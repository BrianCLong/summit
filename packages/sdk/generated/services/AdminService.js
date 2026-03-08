"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const OpenAPI_1 = require("../core/OpenAPI");
const request_1 = require("../core/request");
class AdminService {
    /**
     * List tenants
     * Returns all tenants (admin only)
     * @returns any Tenants returned
     * @throws ApiError
     */
    static getAdminTenants() {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
    static getAdminUsers() {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
    static getAdminAudit(limit = 200, query) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
    static postAdminAuditRecord(xAuditToken, xAuditNonce, xAuditTs, requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
    static getAdminFlags() {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
    static putAdminFlags(key, requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
    static getAdminPolicy() {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
    static putAdminPolicy(requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'PUT',
            url: '/admin/policy',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
exports.AdminService = AdminService;
