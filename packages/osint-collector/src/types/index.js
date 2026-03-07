/**
 * Type definitions for OSINT collection framework
 */
export var CollectionType;
(function (CollectionType) {
    CollectionType["SOCIAL_MEDIA"] = "social_media";
    CollectionType["WEB_SCRAPING"] = "web_scraping";
    CollectionType["RSS_FEED"] = "rss_feed";
    CollectionType["PUBLIC_RECORDS"] = "public_records";
    CollectionType["DOMAIN_INTEL"] = "domain_intel";
    CollectionType["DARK_WEB"] = "dark_web";
    CollectionType["FORUM"] = "forum";
    CollectionType["NEWS"] = "news";
    CollectionType["IMAGE_METADATA"] = "image_metadata";
    CollectionType["GEOLOCATION"] = "geolocation";
})(CollectionType || (CollectionType = {}));
export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["IN_PROGRESS"] = "in_progress";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["FAILED"] = "failed";
    TaskStatus["CANCELLED"] = "cancelled";
})(TaskStatus || (TaskStatus = {}));
export * from './telemetry.js';
export * from './evidence.js';
//# sourceMappingURL=index.js.map