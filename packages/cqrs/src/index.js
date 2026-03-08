"use strict";
/**
 * @intelgraph/cqrs
 *
 * CQRS (Command Query Responsibility Segregation) implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectionManager = exports.QueryBus = exports.CommandBus = void 0;
var CommandBus_js_1 = require("./command/CommandBus.js");
Object.defineProperty(exports, "CommandBus", { enumerable: true, get: function () { return CommandBus_js_1.CommandBus; } });
var QueryBus_js_1 = require("./query/QueryBus.js");
Object.defineProperty(exports, "QueryBus", { enumerable: true, get: function () { return QueryBus_js_1.QueryBus; } });
var ProjectionManager_js_1 = require("./projection/ProjectionManager.js");
Object.defineProperty(exports, "ProjectionManager", { enumerable: true, get: function () { return ProjectionManager_js_1.ProjectionManager; } });
