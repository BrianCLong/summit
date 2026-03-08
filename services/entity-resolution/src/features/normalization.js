"use strict";
/**
 * Entity Resolution Service - Normalization Utilities
 *
 * Provides deterministic normalization for consistent matching
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeName = normalizeName;
exports.normalizeEmail = normalizeEmail;
exports.normalizePhone = normalizePhone;
exports.normalizeOrg = normalizeOrg;
exports.normalizeUrl = normalizeUrl;
/**
 * Normalize a person/organization name
 * - Lowercase
 * - Trim whitespace
 * - Remove punctuation
 * - Collapse multiple spaces
 */
function normalizeName(str) {
    if (!str)
        return '';
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' '); // Collapse spaces
}
/**
 * Normalize an email address
 * - Lowercase
 * - Trim whitespace
 * - Remove Gmail aliases (+foo)
 */
function normalizeEmail(str) {
    if (!str)
        return '';
    const trimmed = str.toLowerCase().trim();
    // Remove Gmail-style aliases
    if (trimmed.includes('@gmail.com') || trimmed.includes('@googlemail.com')) {
        const [local, domain] = trimmed.split('@');
        const cleanLocal = local.replace(/\+.*$/, '').replace(/\./g, '');
        return `${cleanLocal}@${domain}`;
    }
    return trimmed;
}
/**
 * Normalize a phone number to E.164-like format
 * - Remove all non-digit characters
 * - Keep leading + if present
 */
function normalizePhone(str) {
    if (!str)
        return '';
    const cleaned = str.replace(/[^\d+]/g, '');
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}
/**
 * Normalize an organization name
 * - Lowercase
 * - Trim whitespace
 * - Remove common suffixes (Inc, LLC, Ltd, etc.)
 * - Remove punctuation
 */
function normalizeOrg(str) {
    if (!str)
        return '';
    return str
        .toLowerCase()
        .trim()
        .replace(/\b(inc|llc|ltd|corp|corporation|co|company|gmbh|sarl|sa|ag)\b\.?/gi, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Normalize a URL
 * - Lowercase
 * - Remove protocol
 * - Remove www prefix
 * - Remove trailing slash
 * - Remove query params
 */
function normalizeUrl(str) {
    if (!str)
        return '';
    try {
        const url = new URL(str.toLowerCase().trim());
        const hostname = url.hostname.replace(/^www\./, '');
        const pathname = url.pathname.replace(/\/$/, '');
        return hostname + pathname;
    }
    catch {
        // If not a valid URL, just return cleaned string
        return str.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
    }
}
