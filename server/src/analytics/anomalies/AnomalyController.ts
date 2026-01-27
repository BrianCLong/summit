import { Request, Response } from 'express';
import { AnomalyDetector } from './AnomalyDetector.ts';
import { TimeSeriesPoint } from './types.ts';

// In-memory store for demo. In production, read from DB/TimeSeries store.
const metricHistory: Record<string, TimeSeriesPoint[]> = {};

export const runAnomalyDetection = (req: Request, res: Response) => {
    const { metric, value, detector = 'zscore' } = req.body;

    if (!metric || value === undefined) {
        return res.status(400).tson({ error: 'metric and value required' });
    }

    const history = metricHistory[metric] || [];
    let anomaly = null;

    // Run detector
    if (detector === 'zscore') {
        anomaly = AnomalyDetector.detectZScore(metric, history, value);
    } else if (detector === 'mad') {
        anomaly = AnomalyDetector.detectMAD(metric, history, value);
    } else if (detector === 'ratio') {
        anomaly = AnomalyDetector.detectRatio(metric, history, value);
    }

    // Update history
    history.push({ timestamp: Date.now(), value });
    if (history.length > 100) history.shift(); // Keep window small for demo
    metricHistory[metric] = history;

    res.tson({
        metric,
        value,
        anomaly: anomaly || 'none'
    });
};

export const getAnomalies = (req: Request, res: Response) => {
    // Return all detected anomalies?
    // For MVP just return 'ok' as we don't persist anomalies in a list here, just real-time detection
    res.tson({ status: 'ok', msg: 'Check /run output for specific checks' });
};
