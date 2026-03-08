"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const anomalyDetectionController_js_1 = require("../../api/anomalyDetectionController.js");
(0, globals_1.describe)("AnomalyDetectionController Security Tests", () => {
    let controller;
    let mockServiceInstance;
    let req;
    let res;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockServiceInstance = {
            processBatchMetricDataPoints: globals_1.jest.fn().mockResolvedValue([]),
            testAnomalyDetection: globals_1.jest.fn().mockResolvedValue({}),
            getActiveAnomalyAlerts: globals_1.jest.fn().mockResolvedValue([]),
            getAnomalyAlertHistory: globals_1.jest.fn().mockResolvedValue([]),
            acknowledgeAnomalyAlert: globals_1.jest.fn().mockResolvedValue(true),
            resolveAnomalyAlert: globals_1.jest.fn().mockResolvedValue(true),
            trainAnomalyModel: globals_1.jest.fn().mockResolvedValue({}),
            getAnomalyStatistics: globals_1.jest.fn().mockResolvedValue({}),
        };
        controller = new anomalyDetectionController_js_1.AnomalyDetectionController(mockServiceInstance);
        req = {
            body: {},
            query: {},
        };
        res = {
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn(),
        };
    });
    (0, globals_1.describe)("processBatchMetricDataPoints", () => {
        (0, globals_1.it)("should REJECT a large batch of data points (fix verification)", async () => {
            // Create a batch larger than MAX_BATCH_SIZE (1000)
            const largeBatch = Array(1001).fill({ metric: "cpu", value: 50 });
            req.body = { dataPoints: largeBatch };
            await controller.processBatchMetricDataPoints(req, res);
            // Should NOT call service
            (0, globals_1.expect)(mockServiceInstance.processBatchMetricDataPoints).not.toHaveBeenCalled();
            // Should return 400 Bad Request
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                error: globals_1.expect.stringContaining("Batch size exceeds limit"),
            }));
        });
    });
    (0, globals_1.describe)("testAnomalyDetection", () => {
        (0, globals_1.it)("should REJECT testing with a large count (fix verification)", async () => {
            // Count larger than MAX_TEST_COUNT (1000)
            req.body = { metric: "cpu", count: 1001 };
            await controller.testAnomalyDetection(req, res);
            // Should NOT call service
            (0, globals_1.expect)(mockServiceInstance.processBatchMetricDataPoints).not.toHaveBeenCalled();
            // Should return 400 Bad Request
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                error: globals_1.expect.stringContaining("Test count exceeds limit"),
            }));
        });
    });
    (0, globals_1.describe)("getAnomalyAlertHistory", () => {
        (0, globals_1.it)("should CLAMP a large history limit (fix verification)", async () => {
            // Limit larger than MAX_HISTORY_LIMIT (100)
            req.query = { limit: "1000" };
            await controller.getAnomalyAlertHistory(req, res);
            // Should call service with clamped limit (100)
            (0, globals_1.expect)(mockServiceInstance.getAnomalyAlertHistory).toHaveBeenCalledWith(undefined, undefined, undefined, 100);
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(200);
        });
    });
});
