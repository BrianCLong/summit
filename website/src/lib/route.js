"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInternalPath = isInternalPath;
function isInternalPath(href) {
    return href.startsWith("/") && !href.startsWith("//");
}
