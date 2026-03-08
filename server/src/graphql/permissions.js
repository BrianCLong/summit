"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissions = void 0;
// @ts-nocheck
const shield_js_1 = require("./shield.js");
// Rules
const isAuthenticated = (0, shield_js_1.rule)({ cache: 'contextual' })(async (parent, args, ctx, info) => {
    return ctx.user !== null && ctx.user !== undefined;
});
const isAdmin = (0, shield_js_1.rule)({ cache: 'contextual' })(async (parent, args, ctx, info) => {
    return ctx.user?.roles?.includes('admin') || false;
});
// Permissions
exports.permissions = (0, shield_js_1.shield)({
    Query: {
        health: shield_js_1.allow, // Public
        version: shield_js_1.allow, // Public
        _empty: shield_js_1.allow,
        // Admin features
        listPersistedQueries: (0, shield_js_1.and)(isAuthenticated, isAdmin),
        // Default fallback for other queries
        '*': isAuthenticated,
    },
    Mutation: {
        _empty: shield_js_1.allow,
        // Admin features
        upsertPersistedQuery: (0, shield_js_1.and)(isAuthenticated, isAdmin),
        deletePersistedQuery: (0, shield_js_1.and)(isAuthenticated, isAdmin),
        // Default fallback
        '*': isAuthenticated,
    },
}, {
    fallbackRule: isAuthenticated,
    allowExternalErrors: true,
    fallbackError: new Error('Not Authorised!'),
    debug: process.env.NODE_ENV !== 'production'
});
