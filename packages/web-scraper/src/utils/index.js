"use strict";
/**
 * Utility functions for web scraping
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRobotsTxt = checkRobotsTxt;
exports.getRandomUserAgent = getRandomUserAgent;
exports.delay = delay;
exports.normalizeUrl = normalizeUrl;
exports.extractDomain = extractDomain;
/**
 * Check if robots.txt allows scraping
 */
async function checkRobotsTxt(url, userAgent = '*') {
    try {
        const urlObj = new URL(url);
        const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
        const response = await fetch(robotsUrl);
        if (!response.ok) {
            return true; // No robots.txt means allowed
        }
        const robotsTxt = await response.text();
        return isAllowedByRobotsTxt(robotsTxt, urlObj.pathname, userAgent);
    }
    catch {
        return true; // If we can't fetch robots.txt, assume allowed
    }
}
/**
 * Parse robots.txt and check if path is allowed
 */
function isAllowedByRobotsTxt(robotsTxt, path, userAgent) {
    const lines = robotsTxt.split('\n');
    let currentAgent = '';
    let disallowed = [];
    let allowed = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('User-agent:')) {
            currentAgent = trimmed.substring(11).trim();
            if (currentAgent === userAgent || currentAgent === '*') {
                disallowed = [];
                allowed = [];
            }
        }
        else if (currentAgent === userAgent || currentAgent === '*') {
            if (trimmed.startsWith('Disallow:')) {
                const pattern = trimmed.substring(9).trim();
                if (pattern)
                    disallowed.push(pattern);
            }
            else if (trimmed.startsWith('Allow:')) {
                const pattern = trimmed.substring(6).trim();
                if (pattern)
                    allowed.push(pattern);
            }
        }
    }
    // Check if path matches any disallow patterns
    for (const pattern of disallowed) {
        if (path.startsWith(pattern)) {
            // Check if explicitly allowed
            for (const allowPattern of allowed) {
                if (path.startsWith(allowPattern)) {
                    return true;
                }
            }
            return false;
        }
    }
    return true;
}
/**
 * Generate random user agent
 */
function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}
/**
 * Delay execution
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Normalize URL
 */
function normalizeUrl(url) {
    try {
        const urlObj = new URL(url);
        // Remove trailing slash
        urlObj.pathname = urlObj.pathname.replace(/\/$/, '');
        // Sort query parameters
        urlObj.searchParams.sort();
        return urlObj.toString();
    }
    catch {
        return url;
    }
}
/**
 * Extract domain from URL
 */
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    }
    catch {
        return '';
    }
}
