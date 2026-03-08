"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersioningService = void 0;
const OpenAPI_1 = require("../core/OpenAPI");
const request_1 = require("../core/request");
class VersioningService {
    /**
     * List API versions
     * Returns current, latest, and supported API versions
     * @returns any Version manifest
     * @throws ApiError
     */
    static getVersioningVersions() {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/versioning/versions',
        });
    }
    /**
     * Get version details
     * Returns metadata for a specific API version
     * @param version
     * @returns any Version metadata
     * @throws ApiError
     */
    static getVersioningVersions1(version) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/versioning/versions/{version}',
            path: {
                'version': version,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Version compatibility matrix
     * Returns compatibility across supported versions
     * @returns any Compatibility matrix
     * @throws ApiError
     */
    static getVersioningCompatibility() {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/versioning/compatibility',
        });
    }
    /**
     * Compatibility for two versions
     * Returns compatibility between two specific versions
     * @param fromVersion
     * @param toVersion
     * @returns any Compatibility result
     * @throws ApiError
     */
    static getVersioningCompatibility1(fromVersion, toVersion) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/versioning/compatibility/{fromVersion}/{toVersion}',
            path: {
                'fromVersion': fromVersion,
                'toVersion': toVersion,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Get full changelog
     * Returns changelog across all API versions
     * @param format
     * @returns any Changelog content
     * @throws ApiError
     */
    static getVersioningChangelog(format = 'markdown') {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/versioning/changelog',
            query: {
                'format': format,
            },
        });
    }
    /**
     * Get changelog for version
     * Returns changelog for a specific version
     * @param version
     * @param format
     * @returns any Changelog returned
     * @throws ApiError
     */
    static getVersioningChangelog1(version, format = 'json') {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/versioning/changelog/{version}',
            path: {
                'version': version,
            },
            query: {
                'format': format,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Get documentation for version
     * Returns documentation for a specific API version
     * @param version
     * @param format
     * @returns any Documentation returned
     * @throws ApiError
     */
    static getVersioningDocs(version, format = 'json') {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/versioning/docs/{version}',
            path: {
                'version': version,
            },
            query: {
                'format': format,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Get OpenAPI spec for version
     * Returns OpenAPI document for a specific API version
     * @param version
     * @returns any OpenAPI document
     * @throws ApiError
     */
    static getVersioningOpenapi(version) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/versioning/openapi/{version}',
            path: {
                'version': version,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Migration guide
     * Returns migration guide between two versions
     * @param fromVersion
     * @param toVersion
     * @returns any Migration guidance
     * @throws ApiError
     */
    static getVersioningMigration(fromVersion, toVersion) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/versioning/migration/{fromVersion}/{toVersion}',
            path: {
                'fromVersion': fromVersion,
                'toVersion': toVersion,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Breaking changes for version
     * Returns breaking changes for the specified API version
     * @param version
     * @returns any Breaking changes list
     * @throws ApiError
     */
    static getVersioningBreakingChanges(version) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/versioning/breaking-changes/{version}',
            path: {
                'version': version,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Versioning status
     * Returns overall versioning status and statistics
     * @returns any Versioning stats
     * @throws ApiError
     */
    static getVersioningStatus() {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/versioning/status',
        });
    }
}
exports.VersioningService = VersioningService;
