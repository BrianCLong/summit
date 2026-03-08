"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedActions = exports.hasPermission = void 0;
const hasPermission = (link, permission) => {
    return link.permissions.includes(permission);
};
exports.hasPermission = hasPermission;
const allowedActions = (link) => {
    return [...link.permissions];
};
exports.allowedActions = allowedActions;
