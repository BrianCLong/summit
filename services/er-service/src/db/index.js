"use strict";
/**
 * Database Module
 *
 * Exports all database-related components.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewQueueRepository = exports.ReviewQueueRepository = exports.identityClusterRepository = exports.IdentityClusterRepository = exports.identityNodeRepository = exports.IdentityNodeRepository = exports.getDatabase = exports.initializeDatabase = exports.DatabaseManager = void 0;
var connection_js_1 = require("./connection.js");
Object.defineProperty(exports, "DatabaseManager", { enumerable: true, get: function () { return connection_js_1.DatabaseManager; } });
Object.defineProperty(exports, "initializeDatabase", { enumerable: true, get: function () { return connection_js_1.initializeDatabase; } });
Object.defineProperty(exports, "getDatabase", { enumerable: true, get: function () { return connection_js_1.getDatabase; } });
var IdentityNodeRepository_js_1 = require("./IdentityNodeRepository.js");
Object.defineProperty(exports, "IdentityNodeRepository", { enumerable: true, get: function () { return IdentityNodeRepository_js_1.IdentityNodeRepository; } });
Object.defineProperty(exports, "identityNodeRepository", { enumerable: true, get: function () { return IdentityNodeRepository_js_1.identityNodeRepository; } });
var IdentityClusterRepository_js_1 = require("./IdentityClusterRepository.js");
Object.defineProperty(exports, "IdentityClusterRepository", { enumerable: true, get: function () { return IdentityClusterRepository_js_1.IdentityClusterRepository; } });
Object.defineProperty(exports, "identityClusterRepository", { enumerable: true, get: function () { return IdentityClusterRepository_js_1.identityClusterRepository; } });
var ReviewQueueRepository_js_1 = require("./ReviewQueueRepository.js");
Object.defineProperty(exports, "ReviewQueueRepository", { enumerable: true, get: function () { return ReviewQueueRepository_js_1.ReviewQueueRepository; } });
Object.defineProperty(exports, "reviewQueueRepository", { enumerable: true, get: function () { return ReviewQueueRepository_js_1.reviewQueueRepository; } });
