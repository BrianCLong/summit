"use strict";
/**
 * Type definitions for OSINT collection framework
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskStatus = exports.CollectionType = void 0;
var CollectionType;
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
})(CollectionType || (exports.CollectionType = CollectionType = {}));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["IN_PROGRESS"] = "in_progress";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["FAILED"] = "failed";
    TaskStatus["CANCELLED"] = "cancelled";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
__exportStar(require("./telemetry.js"), exports);
__exportStar(require("./evidence.js"), exports);
