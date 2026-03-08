"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = robots;
function robots() {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://topicality.co";
    return {
        rules: [{ userAgent: "*", allow: "/" }],
        sitemap: `${base}/sitemap.xml`
    };
}
