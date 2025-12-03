/**
 * GraphQL Input Sanitization Plugin
 *
 * This plugin performs the following security checks and sanitizations on input variables:
 * 1. Sanitizes string inputs (trims whitespace, removes null bytes).
 * 2. Checks for recursive input object abuse (deeply nested input objects).
 * 3. Validates string length limits for inputs.
 */

import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { GraphQLError } from 'graphql';
import pino from 'pino';

const logger = pino();

export interface InputSanitizationOptions {
  /**
   * Maximum allowed depth for input objects (variables)
   * @default 10
   */
  maxInputDepth?: number;

  /**
   * Maximum allowed length for string inputs
   * @default 10000
   */
  maxStringLength?: number;

  /**
   * Whether to trim whitespace from string inputs
   * @default true
   */
  trimStrings?: boolean;

  /**
   * Whether to remove null bytes from string inputs
   * @default true
   */
  removeNullBytes?: boolean;
}

const DEFAULT_OPTIONS: InputSanitizationOptions = {
  maxInputDepth: 10,
  maxStringLength: 10000,
  trimStrings: true,
  removeNullBytes: true,
};

/**
 * Creates an input sanitization plugin
 */
export function createInputSanitizationPlugin(
  options: InputSanitizationOptions = {}
): ApolloServerPlugin {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };

  return {
    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
      return {
        async didResolveOperation({ request }) {
          if (!request.variables) {
            return;
          }

          try {
            // Process variables in place
            sanitizeVariables(request.variables, finalOptions, 0);
          } catch (error) {
            logger.warn(
              {
                error: error instanceof Error ? error.message : String(error),
                operationName: request.operationName,
              },
              'Input sanitization rejected request'
            );

            throw error;
          }
        },
      };
    },
  };
}

/**
 * Recursively sanitizes and validates variables
 */
function sanitizeVariables(
  value: any,
  options: InputSanitizationOptions,
  depth: number
): any {
  // Check depth limit
  if (depth > (options.maxInputDepth || 10)) {
    throw new GraphQLError(
      `Input object is too deep. Maximum allowed depth is ${options.maxInputDepth}.`,
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // Validate string length
    if (value.length > (options.maxStringLength || 10000)) {
      throw new GraphQLError(
        `Input string is too long. Maximum allowed length is ${options.maxStringLength}.`,
        { extensions: { code: 'BAD_USER_INPUT' } }
      );
    }

    let sanitized = value;

    // Remove null bytes
    if (options.removeNullBytes && sanitized.includes('\u0000')) {
      sanitized = sanitized.replace(/\u0000/g, '');
    }

    // Trim whitespace
    if (options.trimStrings) {
      sanitized = sanitized.trim();
    }

    // Mutate the object if we are inside a container, but here we return the value
    // The caller (if array or object) needs to assign it back.
    // However, strings are immutable primitives, so we can't mutate "value" directly if it was passed as argument.
    // The recursive call handles assignment.
    return sanitized;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = sanitizeVariables(value[i], options, depth + 1);
    }
    return value;
  }

  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      // Validate key length just in case
      if (key.length > 100) {
        throw new GraphQLError('Input object key is too long.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      value[key] = sanitizeVariables(value[key], options, depth + 1);
    }
    return value;
  }

  // Return primitives (number, boolean) as is
  return value;
}
