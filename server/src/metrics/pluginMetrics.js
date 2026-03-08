"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pluginErrors = exports.pluginInvocations = void 0;
const prom_client_1 = require("prom-client");
const registry_js_1 = require("./registry.js");
exports.pluginInvocations = new prom_client_1.Counter({
    name: 'plugin_invocations_total',
    help: 'Total plugin invocations',
    labelNames: ['plugin', 'status', 'tenant'],
    registers: [registry_js_1.registry],
});
exports.pluginErrors = new prom_client_1.Counter({
    name: 'plugin_errors_total',
    help: 'Total plugin errors',
    labelNames: ['plugin', 'tenant'],
    registers: [registry_js_1.registry],
});
