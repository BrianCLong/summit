"use strict";
/**
 * Data Factory Service - Routes Index
 *
 * Registers all API routes with the Fastify application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerQualityRoutes = exports.registerAnnotatorRoutes = exports.registerExportRoutes = exports.registerWorkflowRoutes = exports.registerLabelingRoutes = exports.registerSampleRoutes = exports.registerDatasetRoutes = void 0;
exports.registerRoutes = registerRoutes;
const datasets_js_1 = require("./datasets.js");
Object.defineProperty(exports, "registerDatasetRoutes", { enumerable: true, get: function () { return datasets_js_1.registerDatasetRoutes; } });
const samples_js_1 = require("./samples.js");
Object.defineProperty(exports, "registerSampleRoutes", { enumerable: true, get: function () { return samples_js_1.registerSampleRoutes; } });
const labeling_js_1 = require("./labeling.js");
Object.defineProperty(exports, "registerLabelingRoutes", { enumerable: true, get: function () { return labeling_js_1.registerLabelingRoutes; } });
const workflows_js_1 = require("./workflows.js");
Object.defineProperty(exports, "registerWorkflowRoutes", { enumerable: true, get: function () { return workflows_js_1.registerWorkflowRoutes; } });
const exports_js_1 = require("./exports.js");
Object.defineProperty(exports, "registerExportRoutes", { enumerable: true, get: function () { return exports_js_1.registerExportRoutes; } });
const annotators_js_1 = require("./annotators.js");
Object.defineProperty(exports, "registerAnnotatorRoutes", { enumerable: true, get: function () { return annotators_js_1.registerAnnotatorRoutes; } });
const quality_js_1 = require("./quality.js");
Object.defineProperty(exports, "registerQualityRoutes", { enumerable: true, get: function () { return quality_js_1.registerQualityRoutes; } });
function registerRoutes(app, services) {
    // Register all route modules
    (0, datasets_js_1.registerDatasetRoutes)(app, services);
    (0, samples_js_1.registerSampleRoutes)(app, services);
    (0, labeling_js_1.registerLabelingRoutes)(app, services);
    (0, workflows_js_1.registerWorkflowRoutes)(app, services);
    (0, exports_js_1.registerExportRoutes)(app, services);
    (0, annotators_js_1.registerAnnotatorRoutes)(app, services);
    (0, quality_js_1.registerQualityRoutes)(app, services);
}
