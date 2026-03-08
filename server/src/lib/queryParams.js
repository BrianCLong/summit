"use strict";
/**
 * Query parameter extraction utilities for Express
 * Safely handles the string | string[] | undefined type from req.query
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueryString = getQueryString;
exports.getQueryStringOrDefault = getQueryStringOrDefault;
exports.getQueryStringArray = getQueryStringArray;
exports.getQueryInt = getQueryInt;
exports.getQueryBoolean = getQueryBoolean;
/**
 * Safely extracts a string value from a query parameter.
 * If the value is an array, returns the first element.
 * Returns undefined if the value is not a string or string array.
 */
function getQueryString(value) {
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
function getQueryStringOrDefault(value, defaultValue) {
    return getQueryString(value) ?? defaultValue;
}
/**
 * Safely extracts an array of strings from a query parameter.
 * If the value is a single string, wraps it in an array.
 */
function getQueryStringArray(value) {
    if (typeof value === 'string') {
        return [value];
    }
    if (Array.isArray(value)) {
        return value.filter((v) => typeof v === 'string');
    }
    return [];
}
/**
 * Safely extracts an integer from a query parameter.
 */
function getQueryInt(value, defaultValue) {
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
function getQueryBoolean(value, defaultValue = false) {
    const str = getQueryString(value);
    if (str === undefined) {
        return defaultValue;
    }
    return str === 'true' || str === '1';
}
