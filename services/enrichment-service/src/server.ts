/**
 * Enrichment Service - Data enrichment and analysis
 */

import express from 'express';
import { SentimentAnalyzer, ProfileAnalyzer } from '@intelgraph/social-media-intel';

const app = express();
const PORT = process.env.ENRICHMENT_SERVICE_PORT || 3011;

app.use(express.json());

const sentimentAnalyzer = new SentimentAnalyzer();
const profileAnalyzer = new ProfileAnalyzer();

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'enrichment-service' });
});

app.post('/api/enrich/sentiment', (req, res) => {
  const { text } = req.body;
  const result = sentimentAnalyzer.analyze(text);
  res.json(result);
});

app.post('/api/enrich/profile', (req, res) => {
  const { profile } = req.body;
  const result = profileAnalyzer.analyzeProfile(profile);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Enrichment Service running on port ${PORT}`);
});

export default app;
