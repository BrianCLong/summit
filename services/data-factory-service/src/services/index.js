"use strict";
/**
 * Data Factory Service - Services Index
 *
 * Exports all service classes and creates a dependency-injected service container.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QualityService = exports.AnnotatorService = exports.ExportService = exports.GovernanceService = exports.WorkflowService = exports.LabelingService = exports.SampleService = exports.DatasetService = exports.AuditService = void 0;
exports.createServiceContainer = createServiceContainer;
var AuditService_js_1 = require("./AuditService.js");
Object.defineProperty(exports, "AuditService", { enumerable: true, get: function () { return AuditService_js_1.AuditService; } });
var DatasetService_js_1 = require("./DatasetService.js");
Object.defineProperty(exports, "DatasetService", { enumerable: true, get: function () { return DatasetService_js_1.DatasetService; } });
var SampleService_js_1 = require("./SampleService.js");
Object.defineProperty(exports, "SampleService", { enumerable: true, get: function () { return SampleService_js_1.SampleService; } });
var LabelingService_js_1 = require("./LabelingService.js");
Object.defineProperty(exports, "LabelingService", { enumerable: true, get: function () { return LabelingService_js_1.LabelingService; } });
var WorkflowService_js_1 = require("./WorkflowService.js");
Object.defineProperty(exports, "WorkflowService", { enumerable: true, get: function () { return WorkflowService_js_1.WorkflowService; } });
var GovernanceService_js_1 = require("./GovernanceService.js");
Object.defineProperty(exports, "GovernanceService", { enumerable: true, get: function () { return GovernanceService_js_1.GovernanceService; } });
var ExportService_js_1 = require("./ExportService.js");
Object.defineProperty(exports, "ExportService", { enumerable: true, get: function () { return ExportService_js_1.ExportService; } });
var AnnotatorService_js_1 = require("./AnnotatorService.js");
Object.defineProperty(exports, "AnnotatorService", { enumerable: true, get: function () { return AnnotatorService_js_1.AnnotatorService; } });
var QualityService_js_1 = require("./QualityService.js");
Object.defineProperty(exports, "QualityService", { enumerable: true, get: function () { return QualityService_js_1.QualityService; } });
const AuditService_js_2 = require("./AuditService.js");
const DatasetService_js_2 = require("./DatasetService.js");
const SampleService_js_2 = require("./SampleService.js");
const LabelingService_js_2 = require("./LabelingService.js");
const WorkflowService_js_2 = require("./WorkflowService.js");
const GovernanceService_js_2 = require("./GovernanceService.js");
const ExportService_js_2 = require("./ExportService.js");
const AnnotatorService_js_2 = require("./AnnotatorService.js");
const QualityService_js_2 = require("./QualityService.js");
/**
 * Creates a service container with all services properly initialized
 * with their dependencies.
 */
function createServiceContainer() {
    // Initialize services in dependency order
    const audit = new AuditService_js_2.AuditService();
    const governance = new GovernanceService_js_2.GovernanceService(audit);
    const sample = new SampleService_js_2.SampleService(audit);
    const dataset = new DatasetService_js_2.DatasetService(audit);
    const labeling = new LabelingService_js_2.LabelingService(audit, sample);
    const workflow = new WorkflowService_js_2.WorkflowService(audit, labeling, sample);
    const exportService = new ExportService_js_2.ExportService(audit, governance, dataset);
    const annotator = new AnnotatorService_js_2.AnnotatorService(audit);
    const quality = new QualityService_js_2.QualityService(audit, sample);
    return {
        audit,
        dataset,
        sample,
        labeling,
        workflow,
        governance,
        export: exportService,
        annotator,
        quality,
    };
}
