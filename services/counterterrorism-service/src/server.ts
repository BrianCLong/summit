/**
 * Counterterrorism Service Server
 */

import express from 'express';
import { CounterterrorismService } from './service.js';

const app = express();
const port = process.env.PORT || 3020;

app.use(express.json());

const service = new CounterterrorismService();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'counterterrorism' });
});

// Get threat picture
app.get('/api/threat-picture', async (req, res) => {
  try {
    const picture = await service.getThreatPicture();
    res.json(picture);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get threat picture' });
  }
});

// Get interdiction opportunities
app.get('/api/interdiction-opportunities', async (req, res) => {
  try {
    const opportunities = await service.identifyInterdictionOpportunities();
    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to identify opportunities' });
  }
});

// Get disruption targets
app.get('/api/disruption-targets', async (req, res) => {
  try {
    const targets = await service.identifyDisruptionTargets();
    res.json(targets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to identify targets' });
  }
});

// Access component services
app.get('/api/services/:service', (req, res) => {
  const services = service.getServices();
  const requestedService = req.params.service;

  if (requestedService in services) {
    res.json({ available: true, service: requestedService });
  } else {
    res.status(404).json({ error: 'Service not found' });
  }
});

app.listen(port, () => {
  console.log(`Counterterrorism service listening on port ${port}`);
});

export default app;
