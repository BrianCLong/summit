"use strict";
/**
 * @intelgraph/event-streaming
 *
 * Real-time event streaming and complex event processing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Aggregators = exports.WindowType = exports.WindowedAggregator = exports.PipelineBuilder = exports.StreamProcessor = void 0;
var StreamProcessor_js_1 = require("./processing/StreamProcessor.js");
Object.defineProperty(exports, "StreamProcessor", { enumerable: true, get: function () { return StreamProcessor_js_1.StreamProcessor; } });
Object.defineProperty(exports, "PipelineBuilder", { enumerable: true, get: function () { return StreamProcessor_js_1.PipelineBuilder; } });
var WindowedAggregator_js_1 = require("./windowing/WindowedAggregator.js");
Object.defineProperty(exports, "WindowedAggregator", { enumerable: true, get: function () { return WindowedAggregator_js_1.WindowedAggregator; } });
Object.defineProperty(exports, "WindowType", { enumerable: true, get: function () { return WindowedAggregator_js_1.WindowType; } });
Object.defineProperty(exports, "Aggregators", { enumerable: true, get: function () { return WindowedAggregator_js_1.Aggregators; } });
