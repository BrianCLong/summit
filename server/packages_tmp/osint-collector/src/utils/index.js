"use strict";
/**
 * Utility functions for OSINT collection
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeUrl = sanitizeUrl;
exports.extractDomain = extractDomain;
exports.sleep = sleep;
exports.retryWithBackoff = retryWithBackoff;
exports.hashString = hashString;
exports.isValidEmail = isValidEmail;
exports.extractEmails = extractEmails;
exports.extractUrls = extractUrls;
exports.extractPhoneNumbers = extractPhoneNumbers;
exports.isIPAddress = isIPAddress;
exports.parseUserAgent = parseUserAgent;
/**
 * Sanitize URL for safe processing
 */
function sanitizeUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.toString();
    }
    catch {
        throw new Error(`Invalid URL: ${url}`);
    }
}
/**
 * Extract domain from URL
 */
function extractDomain(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname;
    }
    catch {
        return url;
    }
}
/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (i < maxRetries - 1) {
                const delay = initialDelay * Math.pow(2, i);
                await sleep(delay);
            }
        }
    }
    throw lastError;
}
/**
 * Hash string using SHA-256
 */
async function hashString(input) {
    const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
    return crypto.createHash('sha256').update(input).digest('hex');
}
/**
 * Validate email address
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * Extract emails from text
 */
function extractEmails(text) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return text.match(emailRegex) || [];
}
/**
 * Extract URLs from text
 */
function extractUrls(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
}
/**
 * Extract phone numbers from text (basic)
 */
function extractPhoneNumbers(text) {
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    return text.match(phoneRegex) || [];
}
/**
 * Check if string is an IP address
 */
function isIPAddress(str) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(str) || ipv6Regex.test(str);
}
/**
 * Parse user agent string
 */
function parseUserAgent(ua) {
    // Basic parsing - would use a library like ua-parser-js in production
    return {
        browser: ua.includes('Chrome') ? 'Chrome' : undefined,
        os: ua.includes('Windows') ? 'Windows' : undefined,
        device: ua.includes('Mobile') ? 'Mobile' : 'Desktop'
    };
}
