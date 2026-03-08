"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAccess = hasAccess;
function hasAccess(userRole, required) {
    return userRole === required;
}
