"use strict";
/**
 * Analyst Console - Feature Module
 *
 * Tri-pane analyst console with Graph, Timeline, Map, and "Explain This View" panel.
 * All panes share synchronized global view state for cross-highlighting, filtering,
 * and selection.
 *
 * @example
 * ```tsx
 * import { AnalystConsole, generateMockDataset } from '@/features/analyst-console'
 *
 * const data = generateMockDataset()
 *
 * <AnalystConsole
 *   entities={data.entities}
 *   links={data.links}
 *   events={data.events}
 *   locations={data.locations}
 *   onExport={() => console.log('Export clicked')}
 * />
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockLocations = exports.mockEvents = exports.mockLinks = exports.mockEntities = exports.generateMockLocations = exports.generateMockEvents = exports.generateMockLinks = exports.generateMockEntities = exports.generateMockDataset = exports.ExplainThisViewPanel = exports.AnalystMapPane = exports.TimelinePane = exports.GraphPane = exports.createDefaultViewState = exports.useViewState = exports.useViewFilters = exports.useSelection = exports.useGlobalTimeBrush = exports.useAnalystView = exports.AnalystViewProvider = exports.AnalystConsole = void 0;
// Main component
var AnalystConsole_1 = require("./AnalystConsole");
Object.defineProperty(exports, "AnalystConsole", { enumerable: true, get: function () { return AnalystConsole_1.AnalystConsole; } });
// Context and hooks
var AnalystViewContext_1 = require("./AnalystViewContext");
Object.defineProperty(exports, "AnalystViewProvider", { enumerable: true, get: function () { return AnalystViewContext_1.AnalystViewProvider; } });
Object.defineProperty(exports, "useAnalystView", { enumerable: true, get: function () { return AnalystViewContext_1.useAnalystView; } });
Object.defineProperty(exports, "useGlobalTimeBrush", { enumerable: true, get: function () { return AnalystViewContext_1.useGlobalTimeBrush; } });
Object.defineProperty(exports, "useSelection", { enumerable: true, get: function () { return AnalystViewContext_1.useSelection; } });
Object.defineProperty(exports, "useViewFilters", { enumerable: true, get: function () { return AnalystViewContext_1.useViewFilters; } });
Object.defineProperty(exports, "useViewState", { enumerable: true, get: function () { return AnalystViewContext_1.useViewState; } });
Object.defineProperty(exports, "createDefaultViewState", { enumerable: true, get: function () { return AnalystViewContext_1.createDefaultViewState; } });
// Individual pane components
var GraphPane_1 = require("./GraphPane");
Object.defineProperty(exports, "GraphPane", { enumerable: true, get: function () { return GraphPane_1.GraphPane; } });
var TimelinePane_1 = require("./TimelinePane");
Object.defineProperty(exports, "TimelinePane", { enumerable: true, get: function () { return TimelinePane_1.TimelinePane; } });
var AnalystMapPane_1 = require("./AnalystMapPane");
Object.defineProperty(exports, "AnalystMapPane", { enumerable: true, get: function () { return AnalystMapPane_1.AnalystMapPane; } });
var ExplainThisViewPanel_1 = require("./ExplainThisViewPanel");
Object.defineProperty(exports, "ExplainThisViewPanel", { enumerable: true, get: function () { return ExplainThisViewPanel_1.ExplainThisViewPanel; } });
// Mock data utilities
var mockData_1 = require("./mockData");
Object.defineProperty(exports, "generateMockDataset", { enumerable: true, get: function () { return mockData_1.generateMockDataset; } });
Object.defineProperty(exports, "generateMockEntities", { enumerable: true, get: function () { return mockData_1.generateMockEntities; } });
Object.defineProperty(exports, "generateMockLinks", { enumerable: true, get: function () { return mockData_1.generateMockLinks; } });
Object.defineProperty(exports, "generateMockEvents", { enumerable: true, get: function () { return mockData_1.generateMockEvents; } });
Object.defineProperty(exports, "generateMockLocations", { enumerable: true, get: function () { return mockData_1.generateMockLocations; } });
Object.defineProperty(exports, "mockEntities", { enumerable: true, get: function () { return mockData_1.mockEntities; } });
Object.defineProperty(exports, "mockLinks", { enumerable: true, get: function () { return mockData_1.mockLinks; } });
Object.defineProperty(exports, "mockEvents", { enumerable: true, get: function () { return mockData_1.mockEvents; } });
Object.defineProperty(exports, "mockLocations", { enumerable: true, get: function () { return mockData_1.mockLocations; } });
