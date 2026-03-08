"use strict";
/**
 * API Versioning Routes
 * Provides endpoints for version information, compatibility, and documentation
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.versioningRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../versioning/index.js");
const logger_js_1 = require("../utils/logger.js");
exports.versioningRouter = (0, express_1.Router)();
/**
 * GET /api/versioning/versions
 * List all available API versions
 */
exports.versioningRouter.get('/versions', (req, res) => {
    try {
        const versions = {
            current: index_js_1.versionRegistry.getDefaultVersion(),
            latest: index_js_1.versionRegistry.getLatestVersion(),
            active: index_js_1.versionRegistry.getActiveVersions().map((v) => ({
                version: v.version,
                status: v.status,
                releaseDate: v.releaseDate,
                description: v.description,
                breaking: v.breaking,
            })),
            deprecated: index_js_1.versionRegistry.getDeprecatedVersions().map((v) => ({
                version: v.version,
                deprecationDate: v.deprecationDate,
                sunsetDate: v.sunsetDate,
                description: v.description,
            })),
        };
        res.json(versions);
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Error fetching versions',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/versioning/versions/:version
 * Get detailed information about a specific version
 */
exports.versioningRouter.get('/versions/:version', (req, res) => {
    try {
        const { version } = req.params;
        const versionInfo = index_js_1.versionRegistry.getVersion(version);
        if (!versionInfo) {
            return res.status(404).json({
                error: 'version_not_found',
                message: `API version '${version}' not found`,
            });
        }
        res.json(versionInfo);
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Error fetching version info',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/versioning/compatibility
 * Get version compatibility matrix
 */
exports.versioningRouter.get('/compatibility', (req, res) => {
    try {
        const matrix = index_js_1.versionRegistry.generateCompatibilityMatrix();
        res.json(matrix);
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Error generating compatibility matrix',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/versioning/compatibility/:from/:to
 * Get compatibility information between two versions
 */
exports.versioningRouter.get('/compatibility/:from/:to', (req, res) => {
    try {
        const { from, to } = req.params;
        const fromVersion = index_js_1.versionRegistry.getVersion(from);
        const toVersion = index_js_1.versionRegistry.getVersion(to);
        if (!fromVersion || !toVersion) {
            return res.status(404).json({
                error: 'version_not_found',
                message: 'One or both versions not found',
            });
        }
        const compatibility = index_js_1.versionRegistry.getCompatibility(from, to);
        if (!compatibility) {
            return res.json({
                from,
                to,
                compatible: false,
                autoMigrate: false,
                warnings: ['No compatibility mapping defined between these versions'],
            });
        }
        res.json(compatibility);
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Error fetching compatibility info',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/versioning/changelog
 * Get full changelog across all versions
 */
exports.versioningRouter.get('/changelog', (req, res) => {
    try {
        const format = req.query.format || 'markdown';
        if (format === 'markdown') {
            const markdown = index_js_1.changelogAutomation.generateFullChangelog();
            res.type('text/markdown').send(markdown);
        }
        else {
            const changelogs = index_js_1.versionRegistry.getAllVersions().map((v) => ({
                version: v.version,
                changelog: v.changelog,
            }));
            res.json(changelogs);
        }
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Error generating changelog',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/versioning/changelog/:version
 * Get changelog for a specific version
 */
exports.versioningRouter.get('/changelog/:version', (req, res) => {
    try {
        const { version } = req.params;
        const format = req.query.format || 'json';
        const changelog = index_js_1.changelogAutomation.generateChangelog(version, {
            format: format,
        });
        if (!changelog) {
            return res.status(404).json({
                error: 'version_not_found',
                message: `Version '${version}' not found`,
            });
        }
        switch (format) {
            case 'markdown':
                res.type('text/markdown').send(changelog.markdown);
                break;
            case 'html':
                res.type('text/html').send(changelog.html);
                break;
            default:
                res.json(JSON.parse(changelog.json || '{}'));
        }
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Error generating version changelog',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/versioning/docs/:version
 * Get API documentation for a specific version
 */
exports.versioningRouter.get('/docs/:version', (req, res) => {
    try {
        const { version } = req.params;
        const format = req.query.format || 'json';
        const doc = index_js_1.documentationGenerator.generateDocumentation(version);
        if (!doc) {
            return res.status(404).json({
                error: 'version_not_found',
                message: `Documentation for version '${version}' not found`,
            });
        }
        if (format === 'markdown') {
            const markdown = index_js_1.documentationGenerator.generateMarkdown(version);
            res.type('text/markdown').send(markdown);
        }
        else {
            res.json(doc);
        }
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Error generating documentation',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/versioning/openapi/:version
 * Get OpenAPI specification for a specific version
 */
exports.versioningRouter.get('/openapi/:version', (req, res) => {
    try {
        const { version } = req.params;
        const openapi = index_js_1.documentationGenerator.generateOpenAPI(version);
        if (!openapi) {
            return res.status(404).json({
                error: 'version_not_found',
                message: `OpenAPI spec for version '${version}' not found`,
            });
        }
        res.json(openapi);
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Error generating OpenAPI spec',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/versioning/migration/:from/:to
 * Get migration guide between two versions
 */
exports.versioningRouter.get('/migration/:from/:to', (req, res) => {
    try {
        const { from, to } = req.params;
        const fromDoc = index_js_1.documentationGenerator.generateDocumentation(from);
        if (!fromDoc) {
            return res.status(404).json({
                error: 'version_not_found',
                message: `Source version '${from}' not found`,
            });
        }
        const guide = fromDoc.migrationGuides.find((g) => g.fromVersion === from && g.toVersion === to);
        if (!guide) {
            return res.status(404).json({
                error: 'migration_guide_not_found',
                message: `No migration guide found from ${from} to ${to}`,
            });
        }
        res.json(guide);
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Error fetching migration guide',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/versioning/breaking-changes/:version
 * Get breaking changes for a specific version
 */
exports.versioningRouter.get('/breaking-changes/:version', (req, res) => {
    try {
        const { version } = req.params;
        const breakingChanges = index_js_1.versionRegistry.getBreakingChanges(version);
        if (!breakingChanges) {
            return res.status(404).json({
                error: 'version_not_found',
                message: `Version '${version}' not found`,
            });
        }
        res.json({
            version,
            breakingChanges,
        });
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Error fetching breaking changes',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/versioning/status
 * Get overall API versioning status
 */
exports.versioningRouter.get('/status', (req, res) => {
    try {
        const allVersions = index_js_1.versionRegistry.getAllVersions();
        res.json({
            totalVersions: allVersions.length,
            activeVersions: index_js_1.versionRegistry.getActiveVersions().length,
            deprecatedVersions: index_js_1.versionRegistry.getDeprecatedVersions().length,
            currentDefault: index_js_1.versionRegistry.getDefaultVersion(),
            latestVersion: index_js_1.versionRegistry.getLatestVersion(),
            supportedVersions: allVersions
                .filter((v) => v.status !== 'sunset')
                .map((v) => v.version),
        });
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Error fetching versioning status',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
