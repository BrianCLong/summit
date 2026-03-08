"use strict";
/**
 * Sensor Connectors Package
 *
 * Framework for building sensor connectors that ingest signals
 * into the Signal Bus streaming pipeline.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPollingConnector = exports.PollingConnector = exports.createHttpConnector = exports.HttpConnector = exports.createConnectorManager = exports.ConnectorManager = exports.BaseConnector = void 0;
// Base connector
var base_connector_js_1 = require("./base-connector.js");
Object.defineProperty(exports, "BaseConnector", { enumerable: true, get: function () { return base_connector_js_1.BaseConnector; } });
// Connector manager
var connector_manager_js_1 = require("./connector-manager.js");
Object.defineProperty(exports, "ConnectorManager", { enumerable: true, get: function () { return connector_manager_js_1.ConnectorManager; } });
Object.defineProperty(exports, "createConnectorManager", { enumerable: true, get: function () { return connector_manager_js_1.createConnectorManager; } });
// HTTP connector
var http_connector_js_1 = require("./http-connector.js");
Object.defineProperty(exports, "HttpConnector", { enumerable: true, get: function () { return http_connector_js_1.HttpConnector; } });
Object.defineProperty(exports, "createHttpConnector", { enumerable: true, get: function () { return http_connector_js_1.createHttpConnector; } });
// Polling connector
var polling_connector_js_1 = require("./polling-connector.js");
Object.defineProperty(exports, "PollingConnector", { enumerable: true, get: function () { return polling_connector_js_1.PollingConnector; } });
Object.defineProperty(exports, "createPollingConnector", { enumerable: true, get: function () { return polling_connector_js_1.createPollingConnector; } });
