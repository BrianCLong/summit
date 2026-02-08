/**
 * Query parameter extraction utilities for Express
 * Safely handles the string | string[] | undefined type from req.query
 */

import type { ParsedQs } from 'qs';

type QueryValue = string | string[] | ParsedQs | ParsedQs[] | undefined;

/**
 * Safely extracts a string value from a query parameter.
 * If the value is an array, returns the first element.
 * Returns undefined if the value is not a string or string array.
 */
export function getQueryString(value: QueryValue): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

/**
 * Safely extracts a string value from a query parameter with a default.
 * If the value is an array, returns the first element.
 */
export function getQueryStringOrDefault(value: QueryValue, defaultValue: string): string {
  return getQueryString(value) ?? defaultValue;
}

/**
 * Safely extracts an array of strings from a query parameter.
 * If the value is a single string, wraps it in an array.
 */
export function getQueryStringArray(value: QueryValue): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

/**
 * Safely extracts an integer from a query parameter.
 */
export function getQueryInt(value: QueryValue, defaultValue?: number): number | undefined {
  const str = getQueryString(value);
  if (str === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely extracts a boolean from a query parameter.
 */
export function getQueryBoolean(value: QueryValue, defaultValue = false): boolean {
  const str = getQueryString(value);
  if (str === undefined) {
    return defaultValue;
  }
  return str === 'true' || str === '1';
}
