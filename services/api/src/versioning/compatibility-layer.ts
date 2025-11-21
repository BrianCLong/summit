/**
 * API Compatibility Layer
 * Transforms requests and responses between different API versions
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { versionRegistry } from './version-registry.js';
import { logger } from '../utils/logger.js';

export interface TransformContext {
  fromVersion: string;
  toVersion: string;
  operation: string;
  path: string;
}

export type Transformer = (
  data: any,
  context: TransformContext,
) => any | Promise<any>;

export interface TransformRule {
  from: string;
  to: string;
  requestTransformer?: Transformer;
  responseTransformer?: Transformer;
  graphqlTransformer?: GraphQLTransformer;
}

export interface GraphQLTransformer {
  transformQuery?: (query: string, context: TransformContext) => string;
  transformVariables?: (variables: any, context: TransformContext) => any;
  transformResult?: (result: any, context: TransformContext) => any;
}

class CompatibilityLayer {
  private transformers: Map<string, TransformRule> = new Map();

  constructor() {
    this.registerDefaultTransformers();
  }

  /**
   * Register default transformation rules
   */
  private registerDefaultTransformers(): void {
    // v1 to v2 transformations
    this.registerTransformer({
      from: 'v1',
      to: 'v2',
      requestTransformer: this.transformV1toV2Request.bind(this),
      responseTransformer: this.transformV2toV1Response.bind(this),
      graphqlTransformer: {
        transformQuery: this.transformV1toV2Query.bind(this),
        transformVariables: this.transformV1toV2Variables.bind(this),
        transformResult: this.transformV2toV1Result.bind(this),
      },
    });

    // v2 to v1 transformations (backward compatibility)
    this.registerTransformer({
      from: 'v2',
      to: 'v1',
      requestTransformer: this.transformV2toV1Request.bind(this),
      responseTransformer: this.transformV1toV2Response.bind(this),
      graphqlTransformer: {
        transformQuery: this.transformV2toV1Query.bind(this),
        transformVariables: this.transformV2toV1Variables.bind(this),
        transformResult: this.transformV1toV2Result.bind(this),
      },
    });
  }

  /**
   * Register a new transformer
   */
  registerTransformer(rule: TransformRule): void {
    const key = `${rule.from}-${rule.to}`;
    this.transformers.set(key, rule);
  }

  /**
   * Get transformer for version pair
   */
  getTransformer(from: string, to: string): TransformRule | undefined {
    return this.transformers.get(`${from}-${to}`);
  }

  /**
   * Transform request data from one version to another
   */
  async transformRequest(
    data: any,
    context: TransformContext,
  ): Promise<any> {
    if (context.fromVersion === context.toVersion) {
      return data;
    }

    const transformer = this.getTransformer(
      context.fromVersion,
      context.toVersion,
    );

    if (!transformer?.requestTransformer) {
      logger.warn({
        message: 'No request transformer found',
        from: context.fromVersion,
        to: context.toVersion,
      });
      return data;
    }

    try {
      return await transformer.requestTransformer(data, context);
    } catch (error) {
      logger.error({
        message: 'Error transforming request',
        error: error instanceof Error ? error.message : String(error),
        context,
      });
      throw error;
    }
  }

  /**
   * Transform response data from one version to another
   */
  async transformResponse(
    data: any,
    context: TransformContext,
  ): Promise<any> {
    if (context.fromVersion === context.toVersion) {
      return data;
    }

    const transformer = this.getTransformer(
      context.toVersion,
      context.fromVersion,
    );

    if (!transformer?.responseTransformer) {
      logger.warn({
        message: 'No response transformer found',
        from: context.toVersion,
        to: context.fromVersion,
      });
      return data;
    }

    try {
      return await transformer.responseTransformer(data, context);
    } catch (error) {
      logger.error({
        message: 'Error transforming response',
        error: error instanceof Error ? error.message : String(error),
        context,
      });
      throw error;
    }
  }

  /**
   * Transform GraphQL query
   */
  transformGraphQLQuery(
    query: string,
    context: TransformContext,
  ): string {
    if (context.fromVersion === context.toVersion) {
      return query;
    }

    const transformer = this.getTransformer(
      context.fromVersion,
      context.toVersion,
    );

    if (!transformer?.graphqlTransformer?.transformQuery) {
      return query;
    }

    return transformer.graphqlTransformer.transformQuery(query, context);
  }

  /**
   * Transform GraphQL variables
   */
  transformGraphQLVariables(
    variables: any,
    context: TransformContext,
  ): any {
    if (context.fromVersion === context.toVersion) {
      return variables;
    }

    const transformer = this.getTransformer(
      context.fromVersion,
      context.toVersion,
    );

    if (!transformer?.graphqlTransformer?.transformVariables) {
      return variables;
    }

    return transformer.graphqlTransformer.transformVariables(variables, context);
  }

  /**
   * Transform GraphQL result
   */
  transformGraphQLResult(
    result: any,
    context: TransformContext,
  ): any {
    if (context.fromVersion === context.toVersion) {
      return result;
    }

    const transformer = this.getTransformer(
      context.toVersion,
      context.fromVersion,
    );

    if (!transformer?.graphqlTransformer?.transformResult) {
      return result;
    }

    return transformer.graphqlTransformer.transformResult(result, context);
  }

  // ============================================================================
  // V1 to V2 Transformations
  // ============================================================================

  /**
   * Transform v1 request to v2 format
   * Main change: confidence values from decimal (0-1) to percentage (0-100)
   */
  private transformV1toV2Request(data: any, context: TransformContext): any {
    if (!data) return data;

    // Deep clone to avoid mutations
    const transformed = JSON.parse(JSON.stringify(data));

    // Transform confidence values
    this.transformConfidenceValues(transformed, (val) => val * 100);

    return transformed;
  }

  /**
   * Transform v2 response to v1 format
   */
  private transformV2toV1Response(data: any, context: TransformContext): any {
    if (!data) return data;

    const transformed = JSON.parse(JSON.stringify(data));

    // Transform confidence values back
    this.transformConfidenceValues(transformed, (val) => val / 100);

    return transformed;
  }

  /**
   * Transform v1 GraphQL query to v2
   */
  private transformV1toV2Query(query: string, context: TransformContext): string {
    // Replace deprecated globalSearch with searchEntities
    return query.replace(
      /globalSearch\s*\(/g,
      'searchEntities(',
    );
  }

  /**
   * Transform v1 GraphQL variables to v2
   */
  private transformV1toV2Variables(variables: any, context: TransformContext): any {
    if (!variables) return variables;

    const transformed = JSON.parse(JSON.stringify(variables));

    // Transform confidence values in input objects
    this.transformConfidenceValues(transformed, (val) => val * 100);

    return transformed;
  }

  /**
   * Transform v2 GraphQL result to v1
   */
  private transformV2toV1Result(result: any, context: TransformContext): any {
    if (!result) return result;

    const transformed = JSON.parse(JSON.stringify(result));

    // Transform confidence values back
    this.transformConfidenceValues(transformed, (val) => val / 100);

    return transformed;
  }

  // ============================================================================
  // V2 to V1 Transformations (backward compatibility)
  // ============================================================================

  /**
   * Transform v2 request to v1 format
   */
  private transformV2toV1Request(data: any, context: TransformContext): any {
    if (!data) return data;

    const transformed = JSON.parse(JSON.stringify(data));

    // Transform confidence values back to decimal
    this.transformConfidenceValues(transformed, (val) => val / 100);

    return transformed;
  }

  /**
   * Transform v1 response to v2 format
   */
  private transformV1toV2Response(data: any, context: TransformContext): any {
    if (!data) return data;

    const transformed = JSON.parse(JSON.stringify(data));

    // Transform confidence values to percentage
    this.transformConfidenceValues(transformed, (val) => val * 100);

    return transformed;
  }

  /**
   * Transform v2 GraphQL query to v1
   */
  private transformV2toV1Query(query: string, context: TransformContext): string {
    // Replace searchEntities with globalSearch if needed
    // (though v1 supports searchEntities too)
    return query;
  }

  /**
   * Transform v2 GraphQL variables to v1
   */
  private transformV2toV1Variables(variables: any, context: TransformContext): any {
    if (!variables) return variables;

    const transformed = JSON.parse(JSON.stringify(variables));

    // Transform confidence values back
    this.transformConfidenceValues(transformed, (val) => val / 100);

    return transformed;
  }

  /**
   * Transform v1 GraphQL result to v2
   */
  private transformV1toV2Result(result: any, context: TransformContext): any {
    if (!result) return result;

    const transformed = JSON.parse(JSON.stringify(result));

    // Transform confidence values to percentage
    this.transformConfidenceValues(transformed, (val) => val * 100);

    return transformed;
  }

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Recursively transform confidence values in an object
   */
  private transformConfidenceValues(
    obj: any,
    transform: (val: number) => number,
  ): void {
    if (!obj || typeof obj !== 'object') return;

    for (const key in obj) {
      if (key === 'confidence' && typeof obj[key] === 'number') {
        obj[key] = transform(obj[key]);
      } else if (typeof obj[key] === 'object') {
        this.transformConfidenceValues(obj[key], transform);
      }
    }
  }
}

// Singleton instance
export const compatibilityLayer = new CompatibilityLayer();
