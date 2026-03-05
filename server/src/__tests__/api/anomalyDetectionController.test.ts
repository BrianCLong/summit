import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { Request, Response } from "express";
import { AnomalyDetectionController } from "../../api/anomalyDetectionController.js";
import { AnomalyDetectionService } from "../../ai/anomalyDetectionService.js";

describe("AnomalyDetectionController Security Tests", () => {
  let controller: AnomalyDetectionController;
  let mockServiceInstance: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockServiceInstance = {
      processBatchMetricDataPoints: jest.fn().mockResolvedValue([]),
      testAnomalyDetection: jest.fn().mockResolvedValue({}),
      getActiveAnomalyAlerts: jest.fn().mockResolvedValue([]),
      getAnomalyAlertHistory: jest.fn().mockResolvedValue([]),
      acknowledgeAnomalyAlert: jest.fn().mockResolvedValue(true),
      resolveAnomalyAlert: jest.fn().mockResolvedValue(true),
      trainAnomalyModel: jest.fn().mockResolvedValue({}),
      getAnomalyStatistics: jest.fn().mockResolvedValue({}),
    } as unknown as AnomalyDetectionService;

    controller = new AnomalyDetectionController(mockServiceInstance);

    req = {
      body: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
  });

  describe("processBatchMetricDataPoints", () => {
    it("should REJECT a large batch of data points (fix verification)", async () => {
      // Create a batch larger than MAX_BATCH_SIZE (1000)
      const largeBatch = Array(1001).fill({ metric: "cpu", value: 50 });
      req.body = { dataPoints: largeBatch };

      await controller.processBatchMetricDataPoints(req as Request, res as Response);

      // Should NOT call service
      expect(mockServiceInstance.processBatchMetricDataPoints).not.toHaveBeenCalled();
      // Should return 400 Bad Request
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Batch size exceeds limit"),
        })
      );
    });
  });

  describe("testAnomalyDetection", () => {
    it("should REJECT testing with a large count (fix verification)", async () => {
      // Count larger than MAX_TEST_COUNT (1000)
      req.body = { metric: "cpu", count: 1001 };

      await controller.testAnomalyDetection(req as Request, res as Response);

      // Should NOT call service
      expect(mockServiceInstance.processBatchMetricDataPoints).not.toHaveBeenCalled();
      // Should return 400 Bad Request
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Test count exceeds limit"),
        })
      );
    });
  });

  describe("getAnomalyAlertHistory", () => {
    it("should CLAMP a large history limit (fix verification)", async () => {
      // Limit larger than MAX_HISTORY_LIMIT (100)
      req.query = { limit: "1000" };

      await controller.getAnomalyAlertHistory(req as Request, res as Response);

      // Should call service with clamped limit (100)
      expect(mockServiceInstance.getAnomalyAlertHistory).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        100
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
