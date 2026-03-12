import express from 'express';
import cors from 'cors';
import { IntelligenceController } from './controller.js';

const app = express();
const port = process.env.PORT || 4050;

app.use(cors());
app.use(express.json());

const controller = new IntelligenceController();

app.get('/health', (req, res) => res.send({ status: 'UP' }));

app.get('/api/intel/stability', (req, res) => controller.getStability(req, res));
app.get('/api/intel/topology', (req, res) => controller.getTopology(req, res));
app.get('/api/intel/innovations', (req, res) => controller.getInnovations(req, res));
app.get('/api/strategy', (req, res) => controller.getStrategy(req, res));
app.get('/api/learning', (req, res) => controller.getLearning(req, res));
app.get('/api/system-health', (req, res) => controller.getSystemHealth(req, res));
app.post('/api/simulate', (req, res) => controller.runSimulation(req, res));

app.listen(port, () => {
  console.log(`Intelligence API listening at http://localhost:${port}`);
});
