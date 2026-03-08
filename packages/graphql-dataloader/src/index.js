"use strict";
/**
 * GraphQL DataLoader Package
 *
 * Eliminates N+1 queries in GraphQL resolvers by batching and caching
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
exports.DataLoaderRegistry = exports.createAggregateLoader = exports.createRelationshipLoader = exports.createEntityLoader = void 0;
var createEntityLoader_1 = require("./createEntityLoader");
Object.defineProperty(exports, "createEntityLoader", { enumerable: true, get: function () { return createEntityLoader_1.createEntityLoader; } });
var createRelationshipLoader_1 = require("./createRelationshipLoader");
Object.defineProperty(exports, "createRelationshipLoader", { enumerable: true, get: function () { return createRelationshipLoader_1.createRelationshipLoader; } });
var createAggregateLoader_1 = require("./createAggregateLoader");
Object.defineProperty(exports, "createAggregateLoader", { enumerable: true, get: function () { return createAggregateLoader_1.createAggregateLoader; } });
var DataLoaderRegistry_1 = require("./DataLoaderRegistry");
Object.defineProperty(exports, "DataLoaderRegistry", { enumerable: true, get: function () { return DataLoaderRegistry_1.DataLoaderRegistry; } });
__exportStar(require("./types"), exports);
