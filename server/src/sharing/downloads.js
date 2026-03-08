"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDownloadAllowed = exports.applyDownloadHeaders = void 0;
const permissions_js_1 = require("./permissions.js");
const applyDownloadHeaders = (res, link) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', `attachment; filename="${link.resourceId}.bin"`);
    res.setHeader('Accept-Ranges', 'none');
};
exports.applyDownloadHeaders = applyDownloadHeaders;
const ensureDownloadAllowed = (link) => {
    if (!(0, permissions_js_1.hasPermission)(link, 'download')) {
        const error = new Error('download_not_permitted');
        error.statusCode = 403;
        throw error;
    }
};
exports.ensureDownloadAllowed = ensureDownloadAllowed;
