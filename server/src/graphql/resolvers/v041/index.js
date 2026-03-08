"use strict";
// @ts-nocheck
/**
 * MC Platform v0.4.1 Sovereign Safeguards Resolver Integration
 * Exports all v0.4.1 sovereign safeguards resolvers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sovereignResolvers = exports.v041Resolvers = void 0;
const sovereign_resolvers_js_1 = require("./sovereign-resolvers.js");
const merge_1 = require("@graphql-tools/merge");
// Merge all v0.4.1 resolvers
exports.v041Resolvers = (0, merge_1.mergeResolvers)([sovereign_resolvers_js_1.sovereignResolvers]);
// Export individual resolver modules for selective importing
var sovereign_resolvers_js_2 = require("./sovereign-resolvers.js");
Object.defineProperty(exports, "sovereignResolvers", { enumerable: true, get: function () { return sovereign_resolvers_js_2.sovereignResolvers; } });
