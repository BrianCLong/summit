"use strict";
/**
 * Tri-Pane Analysis Shell - Public API
 *
 * This barrel export provides a clean interface for other parts of
 * the application to use the tri-pane feature.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMockTriPaneData = exports.mockDataProvider = exports.MockTriPaneDataProvider = exports.generateMockGeospatialEvents = exports.generateMockTimelineEvents = exports.generateMockRelationships = exports.generateMockEntities = exports.MapPane = exports.TriPaneShell = void 0;
// Main components
var TriPaneShell_1 = require("./TriPaneShell");
Object.defineProperty(exports, "TriPaneShell", { enumerable: true, get: function () { return TriPaneShell_1.TriPaneShell; } });
var MapPane_1 = require("./MapPane");
Object.defineProperty(exports, "MapPane", { enumerable: true, get: function () { return MapPane_1.MapPane; } });
// Mock data utilities
var mockData_1 = require("./mockData");
Object.defineProperty(exports, "generateMockEntities", { enumerable: true, get: function () { return mockData_1.generateMockEntities; } });
Object.defineProperty(exports, "generateMockRelationships", { enumerable: true, get: function () { return mockData_1.generateMockRelationships; } });
Object.defineProperty(exports, "generateMockTimelineEvents", { enumerable: true, get: function () { return mockData_1.generateMockTimelineEvents; } });
Object.defineProperty(exports, "generateMockGeospatialEvents", { enumerable: true, get: function () { return mockData_1.generateMockGeospatialEvents; } });
Object.defineProperty(exports, "MockTriPaneDataProvider", { enumerable: true, get: function () { return mockData_1.MockTriPaneDataProvider; } });
Object.defineProperty(exports, "mockDataProvider", { enumerable: true, get: function () { return mockData_1.mockDataProvider; } });
Object.defineProperty(exports, "useMockTriPaneData", { enumerable: true, get: function () { return mockData_1.useMockTriPaneData; } });
