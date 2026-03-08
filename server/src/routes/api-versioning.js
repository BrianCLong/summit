"use strict";
/**
 * API Versioning Router
 *
 * Implements versioned API namespaces (/v1/, /v2/) for GA-grade API stability.
 * Breaking changes require version bumps.
 *
 * SOC 2 Controls:
 * - CC7.1: System change detection
 * - CC7.2: System change management
 * - PI1.1: Data processing controls
 *
 * @module api-versioning
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.versionDiscoveryRouter = exports.VERSION_METADATA = exports.DEPRECATED_VERSIONS = exports.LATEST_VERSION = exports.CURRENT_STABLE_VERSION = exports.API_VERSIONS = void 0;
exports.apiVersionMiddleware = apiVersionMiddleware;
exports.createVersionedRouter = createVersionedRouter;
exports.requireMinVersion = requireMinVersion;
exports.versionAdapter = versionAdapter;
exports.setupVersionedApi = setupVersionedApi;
const express_1 = require("express");
const zod_1 = require("zod");
const request_context_js_1 = require("../observability/request-context.js");
// API Version definitions
exports.API_VERSIONS = {
    V1: '1',
    V1_1: '1.1',
    V2: '2',
};
// Current stable and latest versions
exports.CURRENT_STABLE_VERSION = exports.API_VERSIONS.V1_1;
exports.LATEST_VERSION = exports.API_VERSIONS.V2;
exports.DEPRECATED_VERSIONS = [exports.API_VERSIONS.V1];
// Zod schema for version validation
const ApiVersionSchema = zod_1.z.enum(['1', '1.1', '2']);
exports.VERSION_METADATA = {
    '1': {
        version: '1',
        status: 'deprecated',
        releaseDate: '2024-06-01',
        sunsetDate: '2025-06-01',
        changelog: '/docs/changelog/v1.md',
        breakingChanges: [],
    },
    '1.1': {
        version: '1.1',
        status: 'stable',
        releaseDate: '2024-12-01',
        changelog: '/docs/changelog/v1.1.md',
        breakingChanges: [
            'GovernanceVerdict is now mandatory in all DataEnvelope responses',
            'isSimulated flag is now required on all data outputs',
        ],
    },
    '2': {
        version: '2',
        status: 'beta',
        releaseDate: '2025-01-15',
        changelog: '/docs/changelog/v2.md',
        breakingChanges: [
            'All endpoints return DataEnvelope wrapper',
            'Provenance is mandatory on all responses',
            'New authentication flow with PKCE',
        ],
    },
};
/**
 * Middleware to extract and validate API version from request
 *
 * Supports multiple version sources:
 * 1. URL path: /v1/..., /v2/...
 * 2. Header: X-IG-API-Version
 * 3. Query param: ?api_version=1.1
 *
 * Defaults to CURRENT_STABLE_VERSION if not specified.
 */
function apiVersionMiddleware(req, res, next) {
    const logger = request_context_js_1.appLogger.child({ component: 'api-versioning' });
    // Try to extract version from multiple sources
    let version;
    let source = 'default';
    // 1. Check URL path first (/v1/..., /v2/...)
    const pathMatch = req.path.match(/^\/v(\d+(?:\.\d+)?)\//);
    if (pathMatch) {
        version = pathMatch[1];
        source = 'path';
    }
    // 2. Check header
    if (!version) {
        const headerVersion = req.headers['x-ig-api-version'];
        if (typeof headerVersion === 'string') {
            version = headerVersion;
            source = 'header';
        }
    }
    // 3. Check query param
    if (!version && typeof req.query.api_version === 'string') {
        version = req.query.api_version;
        source = 'query';
    }
    // 4. Default to stable version
    if (!version) {
        version = exports.CURRENT_STABLE_VERSION;
        source = 'default';
    }
    // Validate version
    const parseResult = ApiVersionSchema.safeParse(version);
    if (!parseResult.success) {
        logger.warn({ version, source }, 'Invalid API version requested');
        res.status(400).json({
            error: 'Invalid API version',
            message: `Version '${version}' is not supported. Valid versions: ${Object.values(exports.API_VERSIONS).join(', ')}`,
            supportedVersions: Object.values(exports.API_VERSIONS),
        });
        return;
    }
    const validVersion = parseResult.data;
    const metadata = exports.VERSION_METADATA[validVersion];
    // Attach version to request
    req.apiVersion = validVersion;
    req.apiVersionMetadata = metadata;
    // Set version header in response
    res.setHeader('X-IG-API-Version', validVersion);
    res.setHeader('X-IG-API-Version-Status', metadata.status);
    // Add deprecation warning headers
    if (metadata.status === 'deprecated') {
        res.setHeader('Deprecation', `date="${metadata.sunsetDate}"`);
        res.setHeader('Sunset', metadata.sunsetDate || 'TBD');
        res.setHeader('Link', `</api/v${exports.CURRENT_STABLE_VERSION}/>; rel="successor-version"`);
        logger.warn({
            version: validVersion,
            sunsetDate: metadata.sunsetDate,
            correlationId: req.correlationId,
        }, 'Deprecated API version used');
    }
    // Log version usage for analytics
    logger.debug({
        version: validVersion,
        source,
        path: req.path,
        correlationId: req.correlationId,
    }, 'API version resolved');
    next();
}
/**
 * Create a versioned router with automatic version prefix stripping
 *
 * @param version - API version for this router
 * @returns Express Router configured for the version
 */
function createVersionedRouter(version) {
    const router = (0, express_1.Router)();
    // Add version-specific middleware
    router.use((req, res, next) => {
        req.apiVersion = version;
        req.apiVersionMetadata = exports.VERSION_METADATA[version];
        res.setHeader('X-IG-API-Version', version);
        next();
    });
    return router;
}
/**
 * Version gate middleware - ensures request is using required minimum version
 *
 * @param minVersion - Minimum required API version
 */
function requireMinVersion(minVersion) {
    return (req, res, next) => {
        const versionedReq = req;
        const currentVersion = parseFloat(versionedReq.apiVersion || '1');
        const requiredVersion = parseFloat(minVersion);
        if (currentVersion < requiredVersion) {
            res.status(426).json({
                error: 'Upgrade Required',
                message: `This endpoint requires API version ${minVersion} or higher. Current version: ${versionedReq.apiVersion}`,
                currentVersion: versionedReq.apiVersion,
                requiredVersion: minVersion,
                upgradeInfo: exports.VERSION_METADATA[minVersion],
            });
            return;
        }
        next();
    };
}
/**
 * Version compatibility adapter
 *
 * Adapts responses between API versions for backwards compatibility.
 *
 * @param transformers - Version-specific response transformers
 */
function versionAdapter(transformers) {
    return (req, res, next) => {
        const versionedReq = req;
        const originalJson = res.json.bind(res);
        res.json = function (data) {
            const version = versionedReq.apiVersion || exports.CURRENT_STABLE_VERSION;
            const transformer = transformers[version];
            if (transformer) {
                return originalJson(transformer(data));
            }
            return originalJson(data);
        };
        next();
    };
}
/**
 * Version discovery endpoint
 *
 * Returns information about supported API versions.
 */
exports.versionDiscoveryRouter = (0, express_1.Router)();
exports.versionDiscoveryRouter.get('/versions', (_req, res) => {
    res.json({
        currentStable: exports.CURRENT_STABLE_VERSION,
        latest: exports.LATEST_VERSION,
        versions: exports.VERSION_METADATA,
        deprecated: exports.DEPRECATED_VERSIONS,
        documentation: '/api-docs',
    });
});
exports.versionDiscoveryRouter.get('/versions/:version', (req, res) => {
    const version = req.params.version;
    const metadata = exports.VERSION_METADATA[version];
    if (!metadata) {
        res.status(404).json({
            error: 'Version not found',
            supportedVersions: Object.values(exports.API_VERSIONS),
        });
        return;
    }
    res.json(metadata);
});
/**
 * Main API versioning router setup
 *
 * Creates the /v1 and /v2 namespace routers.
 */
function setupVersionedApi() {
    const v1Router = createVersionedRouter(exports.API_VERSIONS.V1_1);
    const v2Router = createVersionedRouter(exports.API_VERSIONS.V2);
    return {
        v1Router,
        v2Router,
        versionMiddleware: apiVersionMiddleware,
        discoveryRouter: exports.versionDiscoveryRouter,
    };
}
exports.default = {
    API_VERSIONS: exports.API_VERSIONS,
    CURRENT_STABLE_VERSION: exports.CURRENT_STABLE_VERSION,
    LATEST_VERSION: exports.LATEST_VERSION,
    DEPRECATED_VERSIONS: exports.DEPRECATED_VERSIONS,
    VERSION_METADATA: exports.VERSION_METADATA,
    apiVersionMiddleware,
    createVersionedRouter,
    requireMinVersion,
    versionAdapter,
    versionDiscoveryRouter: exports.versionDiscoveryRouter,
    setupVersionedApi,
};
