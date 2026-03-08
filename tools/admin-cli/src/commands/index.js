"use strict";
/**
 * Command modules for Admin CLI
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerConfigCommands = exports.registerGraphCommands = exports.registerSecurityCommands = exports.registerDataCommands = exports.registerTenantCommands = exports.registerEnvCommands = void 0;
var env_js_1 = require("./env.js");
Object.defineProperty(exports, "registerEnvCommands", { enumerable: true, get: function () { return env_js_1.registerEnvCommands; } });
var tenant_js_1 = require("./tenant.js");
Object.defineProperty(exports, "registerTenantCommands", { enumerable: true, get: function () { return tenant_js_1.registerTenantCommands; } });
var data_js_1 = require("./data.js");
Object.defineProperty(exports, "registerDataCommands", { enumerable: true, get: function () { return data_js_1.registerDataCommands; } });
var security_js_1 = require("./security.js");
Object.defineProperty(exports, "registerSecurityCommands", { enumerable: true, get: function () { return security_js_1.registerSecurityCommands; } });
var graph_js_1 = require("./graph.js");
Object.defineProperty(exports, "registerGraphCommands", { enumerable: true, get: function () { return graph_js_1.registerGraphCommands; } });
var config_js_1 = require("./config.js");
Object.defineProperty(exports, "registerConfigCommands", { enumerable: true, get: function () { return config_js_1.registerConfigCommands; } });
