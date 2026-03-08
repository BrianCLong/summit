"use strict";
/**
 * Email Analytics Service
 *
 * Tracks email opens, clicks, and other engagement metrics
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAnalyticsService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class EmailAnalyticsService {
    config;
    analytics = new Map();
    trackingDomain;
    constructor(config) {
        this.config = config;
        this.trackingDomain = config?.trackingDomain || 'track.example.com';
    }
    async initialize() {
        // Load existing analytics from database (placeholder)
    }
    /**
     * Track email sent
     */
    async trackSent(data) {
        this.analytics.set(data.messageId, {
            messageId: data.messageId,
            templateId: data.templateId,
            recipientEmail: data.recipientEmail,
            sentAt: data.sentAt,
            opened: false,
            openCount: 0,
            clicked: false,
            clickCount: 0,
            clickedLinks: [],
            bounced: false,
            unsubscribed: false,
            metadata: data.metadata,
        });
    }
    /**
     * Track email open
     */
    async trackOpen(messageId) {
        const analytics = this.analytics.get(messageId);
        if (analytics) {
            if (!analytics.opened) {
                analytics.opened = true;
                analytics.openedAt = new Date();
            }
            analytics.openCount++;
        }
    }
    /**
     * Track link click
     */
    async trackClick(messageId, url) {
        const analytics = this.analytics.get(messageId);
        if (analytics) {
            if (!analytics.clicked) {
                analytics.clicked = true;
                analytics.clickedAt = new Date();
            }
            analytics.clickCount++;
            if (!analytics.clickedLinks.includes(url)) {
                analytics.clickedLinks.push(url);
            }
        }
    }
    /**
     * Track bounce
     */
    async trackBounce(messageId, bounceType, reason) {
        const analytics = this.analytics.get(messageId);
        if (analytics) {
            analytics.bounced = true;
            analytics.bouncedAt = new Date();
            analytics.bounceType = bounceType;
            analytics.bounceReason = reason;
        }
    }
    /**
     * Add open tracking pixel to email
     */
    async addOpenTracking(message) {
        // Generate tracking ID
        const trackingId = this.generateTrackingId(message);
        // Add tracking pixel to HTML
        const trackingPixel = `<img src="https://${this.trackingDomain}/open/${trackingId}" width="1" height="1" style="display:none" alt="" />`;
        message.html = message.html + trackingPixel;
        return message;
    }
    /**
     * Add click tracking to links in email
     */
    async addClickTracking(message) {
        const trackingId = this.generateTrackingId(message);
        // Replace all links with tracking links
        message.html = message.html.replace(/<a\s+href="([^"]+)"/gi, (match, url) => {
            const trackedUrl = this.createTrackedUrl(trackingId, url);
            return `<a href="${trackedUrl}"`;
        });
        return message;
    }
    /**
     * Get analytics for a message
     */
    async getAnalytics(messageId) {
        return this.analytics.get(messageId) || null;
    }
    /**
     * Get analytics for a template
     */
    async getTemplateAnalytics(templateId, dateRange) {
        const templateAnalytics = Array.from(this.analytics.values()).filter((a) => a.templateId === templateId);
        if (dateRange) {
            // Filter by date range
            // Placeholder implementation
        }
        const totalSent = templateAnalytics.length;
        const totalOpened = templateAnalytics.filter((a) => a.opened).length;
        const totalClicked = templateAnalytics.filter((a) => a.clicked).length;
        const totalBounced = templateAnalytics.filter((a) => a.bounced).length;
        return {
            templateId,
            totalSent,
            totalOpened,
            totalClicked,
            totalBounced,
            openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
            clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
            bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
        };
    }
    generateTrackingId(message) {
        const data = `${message.to}-${Date.now()}-${Math.random()}`;
        return crypto_1.default.createHash('sha256').update(data).digest('hex').substring(0, 32);
    }
    createTrackedUrl(trackingId, originalUrl) {
        const encodedUrl = encodeURIComponent(originalUrl);
        return `https://${this.trackingDomain}/click/${trackingId}?url=${encodedUrl}`;
    }
}
exports.EmailAnalyticsService = EmailAnalyticsService;
