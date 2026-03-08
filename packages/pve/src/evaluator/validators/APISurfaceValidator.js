"use strict";
/**
 * API Surface Validator
 *
 * Validates API definitions for breaking changes and governance rules.
 *
 * @module pve/evaluator/validators/APISurfaceValidator
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.APISurfaceValidator = void 0;
const PolicyResult_js_1 = require("../PolicyResult.js");
const DEFAULT_CONFIG = {
    failOnBreaking: true,
    allowNewEndpoints: true,
    requireVersionBump: true,
    restrictedPatterns: [],
};
class APISurfaceValidator {
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    async validate(context) {
        if (context.type !== 'api_surface') {
            return [];
        }
        const input = context.input;
        const results = [];
        // Skip validation if no previous version to compare against, unless specific rules apply
        if (!input.previous) {
            results.push((0, PolicyResult_js_1.pass)('pve.api.initial_version', 'Initial API version'));
            return results;
        }
        const changes = this.compareAPIs(input.previous, input.current, input.apiType);
        // Check for breaking changes
        const breakingChanges = changes.filter((c) => c.type === 'breaking');
        if (breakingChanges.length > 0) {
            if (this.config.failOnBreaking) {
                for (const change of breakingChanges) {
                    results.push((0, PolicyResult_js_1.fail)('pve.api.breaking_change', change.message, {
                        severity: 'error',
                        location: input.filePath ? { file: input.filePath, field: change.path } : undefined,
                        details: change.details,
                        fix: 'Revert the breaking change or increment the major version',
                    }));
                }
            }
            else {
                results.push((0, PolicyResult_js_1.warn)('pve.api.breaking_change', `Found ${breakingChanges.length} breaking changes`, {
                    details: { context: { changes: breakingChanges } },
                }));
            }
        }
        else {
            results.push((0, PolicyResult_js_1.pass)('pve.api.breaking_changes'));
        }
        // Check for new endpoints/assets
        const newEndpoints = changes.filter((c) => c.type === 'non-breaking' && c.message.includes('New endpoint'));
        if (newEndpoints.length > 0) {
            if (!this.config.allowNewEndpoints) {
                for (const endpoint of newEndpoints) {
                    results.push((0, PolicyResult_js_1.warn)('pve.api.new_endpoint', endpoint.message, {
                        location: input.filePath ? { file: input.filePath, field: endpoint.path } : undefined,
                        fix: 'New endpoints require explicit approval',
                    }));
                }
            }
            else {
                results.push((0, PolicyResult_js_1.pass)('pve.api.new_endpoints', `Added ${newEndpoints.length} new endpoints`));
            }
            // Check specific Azure Purview DataAssets patterns
            for (const endpoint of newEndpoints) {
                if (endpoint.path.includes('DataAssets') &&
                    (endpoint.path.includes('create') ||
                        endpoint.path.includes('list') ||
                        endpoint.path.includes('query'))) {
                    results.push((0, PolicyResult_js_1.warn)('pve.api.purview_data_assets', 'New Purview DataAssets endpoint detected - Verify validator coverage', {
                        location: input.filePath ? { file: input.filePath, field: endpoint.path } : undefined,
                        fix: 'Update asset type validators to handle new DataAssets surface',
                    }));
                }
            }
        }
        // Check for version bump
        if (this.config.requireVersionBump && changes.length > 0) {
            const versionChange = this.checkVersionBump(input.previous, input.current);
            if (!versionChange.bumped) {
                results.push((0, PolicyResult_js_1.fail)('pve.api.version_bump', 'API changes detected but version was not bumped', {
                    severity: 'error',
                    location: input.filePath ? { file: input.filePath } : undefined,
                    fix: `Increment the API version (current: ${versionChange.current})`,
                }));
            }
            else {
                results.push((0, PolicyResult_js_1.pass)('pve.api.version_bump'));
            }
        }
        // Check restricted patterns
        if (this.config.restrictedPatterns && this.config.restrictedPatterns.length > 0) {
            results.push(...this.checkRestrictedPatterns(input.current, input.apiType));
        }
        return results;
    }
    compareAPIs(previous, current, type) {
        switch (type) {
            case 'rest':
                return this.compareRestAPI(previous, current);
            case 'graphql':
                return this.compareGraphQL(previous, current);
            default:
                return [];
        }
    }
    compareRestAPI(previous, current) {
        const changes = [];
        const prevPaths = previous.paths || {};
        const currPaths = current.paths || {};
        // Check for removed endpoints (breaking)
        for (const path of Object.keys(prevPaths)) {
            if (!currPaths[path]) {
                changes.push({
                    type: 'breaking',
                    message: `Endpoint removed: ${path}`,
                    path,
                });
            }
            else {
                // Check for removed methods
                const prevMethods = prevPaths[path];
                const currMethods = currPaths[path];
                for (const method of Object.keys(prevMethods)) {
                    if (!currMethods[method]) {
                        changes.push({
                            type: 'breaking',
                            message: `Method ${method.toUpperCase()} removed from ${path}`,
                            path: `${path}.${method}`,
                        });
                    }
                }
            }
        }
        // Check for new endpoints (non-breaking)
        for (const path of Object.keys(currPaths)) {
            if (!prevPaths[path]) {
                changes.push({
                    type: 'non-breaking',
                    message: `New endpoint added: ${path}`,
                    path,
                });
            }
            else {
                // Check for new methods
                const prevMethods = prevPaths[path];
                const currMethods = currPaths[path];
                for (const method of Object.keys(currMethods)) {
                    if (!prevMethods[method]) {
                        changes.push({
                            type: 'non-breaking',
                            message: `New method ${method.toUpperCase()} added to ${path}`,
                            path: `${path}.${method}`,
                        });
                    }
                }
            }
        }
        return changes;
    }
    compareGraphQL(previous, current) {
        // Simplified GraphQL comparison
        // In a real implementation, this would use graphql-inspector or similar
        const changes = [];
        const prevTypes = previous.types || {};
        const currTypes = current.types || {};
        for (const type of Object.keys(prevTypes)) {
            if (!currTypes[type]) {
                changes.push({
                    type: 'breaking',
                    message: `Type removed: ${type}`,
                    path: type,
                });
            }
        }
        for (const type of Object.keys(currTypes)) {
            if (!prevTypes[type]) {
                changes.push({
                    type: 'non-breaking',
                    message: `New type added: ${type}`,
                    path: type,
                });
            }
        }
        return changes;
    }
    checkVersionBump(previous, current) {
        const prev = previous;
        const curr = current;
        const prevVersion = prev.info?.version || prev.version || '0.0.0';
        const currVersion = curr.info?.version || curr.version || '0.0.0';
        return {
            bumped: currVersion !== prevVersion,
            current: currVersion,
            previous: prevVersion,
        };
    }
    checkRestrictedPatterns(api, type) {
        const results = [];
        const patterns = this.config.restrictedPatterns || [];
        if (type === 'rest') {
            const restApi = api;
            const paths = Object.keys(restApi.paths || {});
            for (const path of paths) {
                for (const pattern of patterns) {
                    if (new RegExp(pattern).test(path)) {
                        results.push((0, PolicyResult_js_1.fail)('pve.api.restricted_pattern', `Endpoint matches restricted pattern: ${pattern}`, {
                            severity: 'error',
                            location: { field: path },
                            fix: 'Rename endpoint to avoid restricted patterns',
                        }));
                    }
                }
            }
        }
        if (results.length === 0) {
            results.push((0, PolicyResult_js_1.pass)('pve.api.restricted_patterns'));
        }
        return results;
    }
}
exports.APISurfaceValidator = APISurfaceValidator;
