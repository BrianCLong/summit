"use strict";
// @ts-nocheck
/**
 * MC Platform v0.4.0 Resolver Integration
 * Exports all v0.4.0 transcendent intelligence resolvers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcendentResolvers = exports.v040Resolvers = void 0;
const transcendent_resolvers_js_1 = require("./transcendent-resolvers.js");
const merge_1 = require("@graphql-tools/merge");
// Merge all v0.4.0 resolvers
exports.v040Resolvers = (0, merge_1.mergeResolvers)([transcendent_resolvers_js_1.transcendentResolvers]);
// Export individual resolver modules for selective importing
var transcendent_resolvers_js_2 = require("./transcendent-resolvers.js");
Object.defineProperty(exports, "transcendentResolvers", { enumerable: true, get: function () { return transcendent_resolvers_js_2.transcendentResolvers; } });
