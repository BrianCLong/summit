/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class VersioningService {
    /**
     * List API versions
     * Returns current, latest, and supported API versions
     * @returns any Version manifest
     * @throws ApiError
     */
    public static getVersioningVersions(): CancelablePromise<{
        current?: string;
        latest?: string;
        active?: Array<{
            version?: string;
            status?: 'active' | 'stable' | 'deprecated' | 'sunset';
            releaseDate?: string;
            description?: string;
            breaking?: boolean;
        }>;
        deprecated?: Array<{
            version?: string;
            deprecationDate?: string;
            sunsetDate?: string;
            description?: string;
        }>;
    }> {
        return __request(OpenAPI, {
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
    public static getVersioningVersions1(
        version: string,
    ): CancelablePromise<{
        version?: string;
        status?: string;
        releaseDate?: string;
        deprecationDate?: string;
        sunsetDate?: string;
        description?: string;
        breaking?: boolean;
        changelog?: Array<Record<string, any>>;
    }> {
        return __request(OpenAPI, {
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
    public static getVersioningCompatibility(): CancelablePromise<Record<string, Record<string, {
        compatible?: boolean;
        autoMigrate?: boolean;
        warnings?: Array<string>;
    }>>> {
        return __request(OpenAPI, {
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
    public static getVersioningCompatibility1(
        fromVersion: string,
        toVersion: string,
    ): CancelablePromise<{
        from?: string;
        to?: string;
        compatible?: boolean;
        autoMigrate?: boolean;
        warnings?: Array<string>;
    }> {
        return __request(OpenAPI, {
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
    public static getVersioningChangelog(
        format: 'markdown' | 'json' = 'markdown',
    ): CancelablePromise<Array<Record<string, any>>> {
        return __request(OpenAPI, {
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
    public static getVersioningChangelog1(
        version: string,
        format: 'json' | 'markdown' | 'html' = 'json',
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
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
    public static getVersioningDocs(
        version: string,
        format: 'json' | 'markdown' = 'json',
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
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
    public static getVersioningOpenapi(
        version: string,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
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
    public static getVersioningMigration(
        fromVersion: string,
        toVersion: string,
    ): CancelablePromise<{
        fromVersion?: string;
        toVersion?: string;
        steps?: Array<{
            title?: string;
            description?: string;
            breaking?: boolean;
        }>;
        examples?: Array<Record<string, any>>;
    }> {
        return __request(OpenAPI, {
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
    public static getVersioningBreakingChanges(
        version: string,
    ): CancelablePromise<{
        version?: string;
        breakingChanges?: Array<{
            description?: string;
            impact?: string;
            migration?: string;
        }>;
    }> {
        return __request(OpenAPI, {
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
    public static getVersioningStatus(): CancelablePromise<{
        totalVersions?: number;
        activeVersions?: number;
        deprecatedVersions?: number;
        currentDefault?: string;
        latestVersion?: string;
        supportedVersions?: Array<string>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/versioning/status',
        });
    }
}
