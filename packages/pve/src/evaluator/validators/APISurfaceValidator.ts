/**
 * API Surface Validator
 *
 * Validates API definitions for breaking changes and governance rules.
 *
 * @module pve/evaluator/validators/APISurfaceValidator
 */

import type {
  EvaluationContext,
  PolicyResult,
  APISurfaceInput,
} from '../../types/index.js';
import { pass, fail, warn } from '../PolicyResult.js';

export interface APISurfaceValidatorConfig {
  /** Fail on breaking changes */
  failOnBreaking?: boolean;
  /** Allow new endpoints without review */
  allowNewEndpoints?: boolean;
  /** Required version bump for changes */
  requireVersionBump?: boolean;
  /** Restricted endpoint patterns */
  restrictedPatterns?: string[];
  /** Governance rules for asset types */
  assetGovernance?: {
    requiredFacets?: string[];
    namingConvention?: string;
  };
}

interface APIChange {
  type: 'breaking' | 'non-breaking' | 'info';
  message: string;
  path: string;
  details?: Record<string, unknown>;
}

const DEFAULT_CONFIG: APISurfaceValidatorConfig = {
  failOnBreaking: true,
  allowNewEndpoints: true,
  requireVersionBump: true,
  restrictedPatterns: [],
};

// Define minimal types for API structures to avoid 'any'
interface RestAPI {
  info?: { version?: string };
  version?: string;
  paths?: Record<string, Record<string, unknown>>;
}

interface GraphQLAPI {
  types?: Record<string, unknown>;
  version?: string;
  info?: { version?: string };
}

export class APISurfaceValidator {
  private config: APISurfaceValidatorConfig;

  constructor(config: APISurfaceValidatorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async validate(context: EvaluationContext): Promise<PolicyResult[]> {
    if (context.type !== 'api_surface') {
      return [];
    }

    const input = context.input as APISurfaceInput;
    const results: PolicyResult[] = [];

    // Skip validation if no previous version to compare against, unless specific rules apply
    if (!input.previous) {
      results.push(pass('pve.api.initial_version', 'Initial API version'));
      return results;
    }

    const changes = this.compareAPIs(input.previous, input.current, input.apiType);

    // Check for breaking changes
    const breakingChanges = changes.filter((c) => c.type === 'breaking');
    if (breakingChanges.length > 0) {
      if (this.config.failOnBreaking) {
        for (const change of breakingChanges) {
          results.push(
            fail('pve.api.breaking_change', change.message, {
              severity: 'error',
              location: input.filePath ? { file: input.filePath, field: change.path } : undefined,
              details: change.details,
              fix: 'Revert the breaking change or increment the major version',
            }),
          );
        }
      } else {
        results.push(
          warn('pve.api.breaking_change', `Found ${breakingChanges.length} breaking changes`, {
            details: { context: { changes: breakingChanges } },
          }),
        );
      }
    } else {
      results.push(pass('pve.api.breaking_changes'));
    }

    // Check for new endpoints/assets
    const newEndpoints = changes.filter(
      (c) => c.type === 'non-breaking' && c.message.includes('New endpoint'),
    );
    if (newEndpoints.length > 0) {
      if (!this.config.allowNewEndpoints) {
        for (const endpoint of newEndpoints) {
          results.push(
            warn('pve.api.new_endpoint', endpoint.message, {
              location: input.filePath ? { file: input.filePath, field: endpoint.path } : undefined,
              fix: 'New endpoints require explicit approval',
            }),
          );
        }
      } else {
        results.push(
          pass('pve.api.new_endpoints', `Added ${newEndpoints.length} new endpoints`),
        );
      }

      // Check specific Azure Purview DataAssets patterns
      for (const endpoint of newEndpoints) {
        if (
          endpoint.path.includes('DataAssets') &&
          (endpoint.path.includes('create') ||
            endpoint.path.includes('list') ||
            endpoint.path.includes('query'))
        ) {
          results.push(
            warn(
              'pve.api.purview_data_assets',
              'New Purview DataAssets endpoint detected - Verify validator coverage',
              {
                location: input.filePath ? { file: input.filePath, field: endpoint.path } : undefined,
                fix: 'Update asset type validators to handle new DataAssets surface',
              },
            ),
          );
        }
      }
    }

    // Check for version bump
    if (this.config.requireVersionBump && changes.length > 0) {
      const versionChange = this.checkVersionBump(input.previous, input.current);
      if (!versionChange.bumped) {
        results.push(
          fail('pve.api.version_bump', 'API changes detected but version was not bumped', {
            severity: 'error',
            location: input.filePath ? { file: input.filePath } : undefined,
            fix: `Increment the API version (current: ${versionChange.current})`,
          }),
        );
      } else {
        results.push(pass('pve.api.version_bump'));
      }
    }

    // Check restricted patterns
    if (this.config.restrictedPatterns && this.config.restrictedPatterns.length > 0) {
      results.push(...this.checkRestrictedPatterns(input.current, input.apiType));
    }

    return results;
  }

  private compareAPIs(
    previous: unknown,
    current: unknown,
    type: APISurfaceInput['apiType'],
  ): APIChange[] {
    switch (type) {
      case 'rest':
        return this.compareRestAPI(previous as RestAPI, current as RestAPI);
      case 'graphql':
        return this.compareGraphQL(previous as GraphQLAPI, current as GraphQLAPI);
      default:
        return [];
    }
  }

  private compareRestAPI(previous: RestAPI, current: RestAPI): APIChange[] {
    const changes: APIChange[] = [];
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
      } else {
        // Check for removed methods
        const prevMethods = prevPaths[path] as Record<string, unknown>;
        const currMethods = currPaths[path] as Record<string, unknown>;

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
      } else {
        // Check for new methods
        const prevMethods = prevPaths[path] as Record<string, unknown>;
        const currMethods = currPaths[path] as Record<string, unknown>;

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

  private compareGraphQL(previous: GraphQLAPI, current: GraphQLAPI): APIChange[] {
    // Simplified GraphQL comparison
    // In a real implementation, this would use graphql-inspector or similar
    const changes: APIChange[] = [];

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

  private checkVersionBump(
    previous: unknown,
    current: unknown,
  ): { bumped: boolean; current: string; previous: string } {
    const prev = previous as RestAPI | GraphQLAPI;
    const curr = current as RestAPI | GraphQLAPI;

    const prevVersion = prev.info?.version || prev.version || '0.0.0';
    const currVersion = curr.info?.version || curr.version || '0.0.0';

    return {
      bumped: currVersion !== prevVersion,
      current: currVersion,
      previous: prevVersion,
    };
  }

  private checkRestrictedPatterns(
    api: unknown,
    type: APISurfaceInput['apiType'],
  ): PolicyResult[] {
    const results: PolicyResult[] = [];
    const patterns = this.config.restrictedPatterns || [];

    if (type === 'rest') {
      const restApi = api as RestAPI;
      const paths = Object.keys(restApi.paths || {});
      for (const path of paths) {
        for (const pattern of patterns) {
          if (new RegExp(pattern).test(path)) {
            results.push(
              fail('pve.api.restricted_pattern', `Endpoint matches restricted pattern: ${pattern}`, {
                severity: 'error',
                location: { field: path },
                fix: 'Rename endpoint to avoid restricted patterns',
              }),
            );
          }
        }
      }
    }

    if (results.length === 0) {
      results.push(pass('pve.api.restricted_patterns'));
    }

    return results;
  }
}
