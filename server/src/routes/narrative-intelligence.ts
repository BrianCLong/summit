// @ts-nocheck
import express, { type Request, type Response } from 'express';
import { InfluenceOperationsService } from '../services/InfluenceOperationsService.js';
import { NarrativeAnalysisService } from '../services/NarrativeAnalysisService.js';
import { CIBDetectionService } from '../services/CIBDetectionService.js';
import { SentimentAnalysisService } from '../services/SentimentAnalysisService.js';
import logger from '../utils/logger.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();

const influenceService = InfluenceOperationsService.getInstance();
const narrativeService = new NarrativeAnalysisService();
const cibService = new CIBDetectionService();
const sentimentService = new SentimentAnalysisService();

// Trigger narrative detection/snapshot
router.post('/narrative/:id/detect', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
        const narrativeId = req.params.id;
        const snapshot = await narrativeService.takeSnapshot(narrativeId);
        res.json(snapshot);
    } catch (error: any) {
        logger.error('Error in narrative detection', error);
        res.status(500).json({ error: 'Detection failed' });
    }
});

// Get narrative evolution
router.get('/narrative/:id/evolution', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
        const history = await narrativeService.getNarrativeEvolution(req.params.id);
        const trends = await narrativeService.detectTrends(req.params.id);
        res.json({ history, trends });
    } catch (error: any) {
        logger.error('Error fetching narrative evolution', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Get graph stats/metrics
router.get('/narrative/:id/graph', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
        // Expose graph centrality and communities
        const network = await influenceService.getInfluenceNetwork(req.params.id);
        res.json(network);
    } catch (error: any) {
        logger.error('Error fetching graph network', error);
        res.status(500).json({ error: 'Failed to fetch network' });
    }
});

// Analyze sentiment (ad-hoc)
router.post('/analyze/sentiment', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
        const { text, topic } = req.body;
        if (!text) return res.status(400).json({ error: 'Text required' });

        const sentiment = sentimentService.analyzeSentiment(text);
        const emotion = sentimentService.analyzeEmotion(text);
        const toxicity = sentimentService.analyzeToxicity(text);
        const stance = topic ? sentimentService.analyzeStance(text, topic) : null;

        res.json({ sentiment, emotion, toxicity, stance });
    } catch (error: any) {
        logger.error('Error analyzing sentiment', error);
        res.status(500).json({ error: 'Analysis failed' });
    }
});

// CIB Detection Trigger
router.post('/cib/detect', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
        const { entityIds, telemetry, texts } = req.body;
        // Transform JSON body to Maps
        const telemetryMap = new Map(Object.entries(telemetry || {}));
        const textsMap = new Map(Object.entries(texts || {}));

        const result = await cibService.detectCIB(entityIds || [], telemetryMap, textsMap);
        res.json(result);
    } catch (error: any) {
        logger.error('Error detecting CIB', error);
        res.status(500).json({ error: 'CIB detection failed' });
    }
});

export default router;
