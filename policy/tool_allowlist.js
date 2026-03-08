"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkToolAllowed = checkToolAllowed;
function checkToolAllowed(p, toolName) {
    if (!p.allowedTools.includes(toolName)) {
        throw new Error(`tool_denied:${toolName}`);
    }
}
