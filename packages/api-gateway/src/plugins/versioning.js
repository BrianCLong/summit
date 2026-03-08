"use strict";
/**
 * API Versioning Plugin
 *
 * Supports multiple versioning strategies:
 * - URL path versioning (/v1/users, /v2/users)
 * - Header versioning (Accept-Version: v1)
 * - Query parameter versioning (?version=v1)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionManager = exports.VersioningStrategy = void 0;
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('versioning');
var VersioningStrategy;
(function (VersioningStrategy) {
    VersioningStrategy["URL_PATH"] = "URL_PATH";
    VersioningStrategy["HEADER"] = "HEADER";
    VersioningStrategy["QUERY_PARAM"] = "QUERY_PARAM";
    VersioningStrategy["CONTENT_TYPE"] = "CONTENT_TYPE";
})(VersioningStrategy || (exports.VersioningStrategy = VersioningStrategy = {}));
class VersionManager {
    config;
    constructor(config) {
        this.config = {
            headerName: 'Accept-Version',
            queryParamName: 'version',
            defaultVersion: 'v1',
            ...config,
        };
    }
    extractVersion(req) {
        let version = null;
        switch (this.config.strategy) {
            case VersioningStrategy.URL_PATH:
                version = this.extractFromUrlPath(req.url || '');
                break;
            case VersioningStrategy.HEADER:
                version = this.extractFromHeader(req);
                break;
            case VersioningStrategy.QUERY_PARAM:
                version = this.extractFromQueryParam(req.url || '');
                break;
            case VersioningStrategy.CONTENT_TYPE:
                version = this.extractFromContentType(req);
                break;
        }
        // Validate version
        if (version && !this.isVersionSupported(version)) {
            logger.warn('Unsupported API version requested', {
                version,
                supported: this.config.supportedVersions,
            });
            return null;
        }
        return version || this.config.defaultVersion || null;
    }
    extractFromUrlPath(url) {
        const match = url.match(/\/(v\d+)\//);
        return match ? match[1] : null;
    }
    extractFromHeader(req) {
        return req.headers[this.config.headerName.toLowerCase()] || null;
    }
    extractFromQueryParam(url) {
        const urlObj = new URL(url, 'http://localhost');
        return urlObj.searchParams.get(this.config.queryParamName) || null;
    }
    extractFromContentType(req) {
        const contentType = req.headers['content-type'] || '';
        const match = contentType.match(/version=(v\d+)/);
        return match ? match[1] : null;
    }
    isVersionSupported(version) {
        return this.config.supportedVersions.includes(version);
    }
    rewriteUrl(url, version) {
        // Rewrite URL to include version if not already present
        if (this.config.strategy === VersioningStrategy.URL_PATH) {
            if (!url.match(/\/v\d+\//)) {
                const parts = url.split('/');
                parts.splice(1, 0, version);
                return parts.join('/');
            }
        }
        return url;
    }
    getSupportedVersions() {
        return [...this.config.supportedVersions];
    }
    getDefaultVersion() {
        return this.config.defaultVersion || 'v1';
    }
}
exports.VersionManager = VersionManager;
