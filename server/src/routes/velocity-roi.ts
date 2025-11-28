
import { Router } from 'express';
import { VelocityTracker } from '../products/VelocityROI/VelocityTracker.js';
import { ROICalculator } from '../products/VelocityROI/ROICalculator.js';

const router = Router();
const tracker = new VelocityTracker();
const calculator = new ROICalculator(tracker);

// Seed some data
tracker.addMetric({ timestamp: Date.now(), prCount: 2, avgCycleTimeHours: 4, contextSwitches: 5, aiAssistanceRate: 0.2 });
tracker.addMetric({ timestamp: Date.now(), prCount: 3, avgCycleTimeHours: 3, contextSwitches: 3, aiAssistanceRate: 0.5 });

/**
 * @route GET /api/velocity-roi/dashboard
 * @description Returns velocity metrics and ROI calculations.
 */
router.get('/dashboard', (req, res) => {
    try {
        const roi = calculator.calculateROI();
        const reduction = tracker.getContextSwitchReduction(10); // Assume baseline 10 switches

        res.json({
            metrics: tracker.getMetrics(),
            analysis: {
                roi,
                contextSwitchReductionPercent: reduction.toFixed(1),
                projectedAnnualSavings: roi.savings * 52
            }
        });
    } catch (error) {
        console.error('Velocity dashboard error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route POST /api/velocity-roi/ingest
 * @description Ingests a new metric point.
 */
router.post('/ingest', (req, res) => {
    try {
        const metric = req.body;
        if (metric.prCount === undefined || metric.aiAssistanceRate === undefined) {
            return res.status(400).json({ error: 'Invalid metric data' });
        }

        tracker.addMetric({ ...metric, timestamp: Date.now() });
        res.status(201).json({ status: 'ingested' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
