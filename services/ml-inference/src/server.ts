/**
 * ML Inference Service
 * Provides REST API for sentiment analysis, narrative tracking, and influence detection
 */

import express from 'express';
import { SentimentAnalyzer } from '@intelgraph/sentiment-analysis';
import { NarrativeExtractor, FramingAnalyzer, NarrativeTracker, CounterNarrativeDetector } from '@intelgraph/narrative-tracking';
import { BotDetector, CIBDetector, AstroturfingDetector, AmplificationDetector } from '@intelgraph/influence-detection';

const app = express();
const port = process.env.ML_INFERENCE_PORT || 3500;

app.use(express.json({ limit: '10mb' }));

// Initialize analyzers
const sentimentAnalyzer = new SentimentAnalyzer();
const narrativeExtractor = new NarrativeExtractor();
const framingAnalyzer = new FramingAnalyzer();
const narrativeTracker = new NarrativeTracker();
const counterNarrativeDetector = new CounterNarrativeDetector();
const botDetector = new BotDetector();
const cibDetector = new CIBDetector();
const astroturfingDetector = new AstroturfingDetector();
const amplificationDetector = new AmplificationDetector();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ml-inference', version: '0.1.0' });
});

// Sentiment Analysis Endpoints
app.post('/api/sentiment/analyze', async (req, res) => {
  try {
    const { text, options } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await sentimentAnalyzer.analyze(text, options);
    res.json(result);
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({ error: 'Sentiment analysis failed' });
  }
});

app.post('/api/sentiment/analyze-batch', async (req, res) => {
  try {
    const { texts, options } = req.body;

    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({ error: 'Texts array is required' });
    }

    const results = await sentimentAnalyzer.analyzeBatch(texts, options);
    res.json(results);
  } catch (error) {
    console.error('Batch sentiment analysis error:', error);
    res.status(500).json({ error: 'Batch sentiment analysis failed' });
  }
});

// Narrative Analysis Endpoints
app.post('/api/narrative/extract', async (req, res) => {
  try {
    const { text, source } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const narrative = await narrativeExtractor.extractNarrative(text, source || 'unknown');
    res.json(narrative);
  } catch (error) {
    console.error('Narrative extraction error:', error);
    res.status(500).json({ error: 'Narrative extraction failed' });
  }
});

app.post('/api/narrative/framing', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const framing = await framingAnalyzer.analyzeFraming(text);
    res.json(framing);
  } catch (error) {
    console.error('Framing analysis error:', error);
    res.status(500).json({ error: 'Framing analysis failed' });
  }
});

app.get('/api/narrative/active', (req, res) => {
  try {
    const timeWindow = req.query.timeWindow ? parseInt(req.query.timeWindow as string) : undefined;
    const narratives = narrativeTracker.getActiveNarratives(timeWindow);
    res.json(narratives);
  } catch (error) {
    console.error('Get active narratives error:', error);
    res.status(500).json({ error: 'Failed to get active narratives' });
  }
});

app.get('/api/narrative/trending', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const narratives = narrativeTracker.getTrendingNarratives(limit);
    res.json(narratives);
  } catch (error) {
    console.error('Get trending narratives error:', error);
    res.status(500).json({ error: 'Failed to get trending narratives' });
  }
});

// Influence Detection Endpoints
app.post('/api/influence/bot-detection', async (req, res) => {
  try {
    const { activity } = req.body;

    if (!activity) {
      return res.status(400).json({ error: 'Activity data is required' });
    }

    const result = await botDetector.detectBot(activity);
    res.json(result);
  } catch (error) {
    console.error('Bot detection error:', error);
    res.status(500).json({ error: 'Bot detection failed' });
  }
});

app.post('/api/influence/cib-detection', async (req, res) => {
  try {
    const { behaviors } = req.body;

    if (!behaviors || !Array.isArray(behaviors)) {
      return res.status(400).json({ error: 'Behaviors array is required' });
    }

    const results = await cibDetector.detectCIB(behaviors);
    res.json(results);
  } catch (error) {
    console.error('CIB detection error:', error);
    res.status(500).json({ error: 'CIB detection failed' });
  }
});

app.post('/api/influence/astroturfing', async (req, res) => {
  try {
    const { activities, topic } = req.body;

    if (!activities || !Array.isArray(activities)) {
      return res.status(400).json({ error: 'Activities array is required' });
    }

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const result = await astroturfingDetector.detectAstroturfing(activities, topic);
    res.json(result);
  } catch (error) {
    console.error('Astroturfing detection error:', error);
    res.status(500).json({ error: 'Astroturfing detection failed' });
  }
});

app.post('/api/influence/amplification', async (req, res) => {
  try {
    const { nodes } = req.body;

    if (!nodes || !Array.isArray(nodes)) {
      return res.status(400).json({ error: 'Nodes array is required' });
    }

    const networks = await amplificationDetector.detectAmplificationNetworks(nodes);
    res.json(networks);
  } catch (error) {
    console.error('Amplification detection error:', error);
    res.status(500).json({ error: 'Amplification detection failed' });
  }
});

// Initialize service
async function initializeService() {
  try {
    console.log('Initializing ML Inference Service...');
    await sentimentAnalyzer.initialize();
    console.log('ML Inference Service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize ML Inference Service:', error);
    process.exit(1);
  }
}

// Start server
initializeService().then(() => {
  app.listen(port, () => {
    console.log(`ML Inference Service listening on port ${port}`);
  });
});

export { app };
