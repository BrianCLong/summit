"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnomalyDetectionRouter = void 0;
// server/src/api/anomalyDetectionRouter.ts
const express_1 = __importDefault(require("express"));
const anomalyDetectionController_js_1 = require("./anomalyDetectionController.js");
const createAnomalyDetectionRouter = (anomalyService) => {
    const router = express_1.default.Router();
    const controller = new anomalyDetectionController_js_1.AnomalyDetectionController(anomalyService);
    // Process single metric data point for anomaly detection
    router.post('/process', controller.processMetricDataPoint.bind(controller));
    // Process batch of metric data points
    router.post('/batch-process', controller.processBatchMetricDataPoints.bind(controller));
    // Get active anomaly alerts
    router.get('/alerts/active', controller.getActiveAnomalyAlerts.bind(controller));
    // Get anomaly alert history
    router.get('/alerts/history', controller.getAnomalyAlertHistory.bind(controller));
    // Acknowledge an anomaly alert
    router.post('/alerts/:alertId/acknowledge', controller.acknowledgeAnomalyAlert.bind(controller));
    // Resolve an anomaly alert
    router.post('/alerts/:alertId/resolve', controller.resolveAnomalyAlert.bind(controller));
    // Train the anomaly detection model
    router.post('/train', controller.trainAnomalyModel.bind(controller));
    // Get anomaly detection statistics
    router.get('/statistics', controller.getAnomalyStatistics.bind(controller));
    // Test endpoint with sample data
    router.post('/test', controller.testAnomalyDetection.bind(controller));
    return router;
};
exports.createAnomalyDetectionRouter = createAnomalyDetectionRouter;
