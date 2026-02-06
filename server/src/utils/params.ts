/**
 * Utility for handling Express request parameters and query strings
 * that may be strings or arrays of strings.
 */

/**
 * Ensures a parameter that could be a string or string array is returned as a single string.
 * If the value is an array, it returns the first element.
 * If the value is undefined or null, it returns an empty string.
 *
 * @param value - The value to normalize
 * @returns A single string
 */
export const singleParam = (value: string | string[] | undefined | null): string => {
    if (Array.isArray(value)) {
        return value[0] || '';
    }
    return value ?? '';
};

/**
 * Normalizes a value to an array of strings.
 * If the value is a string, it splits it by a comma or wraps it in an array.
 *
 * @param value - The value to normalize
 * @param separator - Optional separator if value is a comma-separated string
 * @returns An array of strings
 */
export const arrayParam = (value: string | string[] | undefined | null, separator = ','): string[] => {
    if (!value) {
        return [];
    }
    if (Array.isArray(value)) {
        return value;
    }
    return value.includes(separator) ? value.split(separator).map(s => s.trim()) : [value];
};
