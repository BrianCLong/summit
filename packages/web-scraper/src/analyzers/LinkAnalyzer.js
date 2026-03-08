"use strict";
/**
 * Link Analyzer - Analyzes links and creates relationship maps
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkAnalyzer = void 0;
class LinkAnalyzer {
    /**
     * Analyze links from a page
     */
    analyze(links) {
        const analysis = {
            totalLinks: links.length,
            internalLinks: links.filter(l => l.type === 'internal').length,
            externalLinks: links.filter(l => l.type === 'external').length,
            uniqueDomains: [],
            brokenLinks: [],
            linkGraph: new Map()
        };
        // Extract unique domains
        const domains = new Set();
        for (const link of links) {
            try {
                const url = new URL(link.href);
                domains.add(url.hostname);
            }
            catch (e) {
                // Invalid URL
            }
        }
        analysis.uniqueDomains = Array.from(domains);
        return analysis;
    }
    /**
     * Build link graph for visualization
     */
    buildLinkGraph(url, links) {
        const graph = new Map();
        const sourceUrl = new URL(url);
        graph.set(sourceUrl.hostname, []);
        for (const link of links) {
            try {
                const targetUrl = new URL(link.href);
                const targets = graph.get(sourceUrl.hostname) || [];
                if (!targets.includes(targetUrl.hostname)) {
                    targets.push(targetUrl.hostname);
                }
                graph.set(sourceUrl.hostname, targets);
            }
            catch (e) {
                // Invalid URL
            }
        }
        return graph;
    }
    /**
     * Find suspicious links (potential phishing, malware, etc.)
     */
    findSuspiciousLinks(links) {
        const suspicious = [];
        const suspiciousPatterns = [
            /bit\.ly/i,
            /tinyurl/i,
            /goo\.gl/i,
            /t\.co/i,
            /\.exe$/i,
            /\.scr$/i,
            /\.bat$/i,
            /\.cmd$/i
        ];
        for (const link of links) {
            for (const pattern of suspiciousPatterns) {
                if (pattern.test(link.href)) {
                    suspicious.push(link);
                    break;
                }
            }
        }
        return suspicious;
    }
    /**
     * Extract social media links
     */
    extractSocialMedia(links) {
        const socialMedia = {
            twitter: [],
            facebook: [],
            linkedin: [],
            instagram: [],
            youtube: [],
            github: []
        };
        for (const link of links) {
            const href = link.href.toLowerCase();
            if (href.includes('twitter.com') || href.includes('x.com')) {
                socialMedia.twitter.push(link.href);
            }
            else if (href.includes('facebook.com')) {
                socialMedia.facebook.push(link.href);
            }
            else if (href.includes('linkedin.com')) {
                socialMedia.linkedin.push(link.href);
            }
            else if (href.includes('instagram.com')) {
                socialMedia.instagram.push(link.href);
            }
            else if (href.includes('youtube.com')) {
                socialMedia.youtube.push(link.href);
            }
            else if (href.includes('github.com')) {
                socialMedia.github.push(link.href);
            }
        }
        return socialMedia;
    }
}
exports.LinkAnalyzer = LinkAnalyzer;
