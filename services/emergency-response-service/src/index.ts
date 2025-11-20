import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { EmergencyResponseCoordinator } from './coordinator.js';
import pino from 'pino';

const logger = pino({ level: 'info' });
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

const port = process.env.PORT || 3101;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'emergency-response-service' });
});

// Initialize coordinator
const coordinator = new EmergencyResponseCoordinator(io);

// Task Management
app.post('/api/v1/tasks', async (req, res) => {
  try {
    const task = await coordinator.createTask(req.body);
    res.status(201).json(task);
  } catch (error: any) {
    logger.error('Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/tasks/active', async (req, res) => {
  try {
    const tasks = coordinator.getActiveTasks();
    res.json(tasks);
  } catch (error: any) {
    logger.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/v1/tasks/:id/status', async (req, res) => {
  try {
    await coordinator.updateTaskStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error updating task status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Team Management
app.post('/api/v1/teams', async (req, res) => {
  try {
    const team = await coordinator.createTeam(req.body);
    res.status(201).json(team);
  } catch (error: any) {
    logger.error('Error creating team:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/teams/available', async (req, res) => {
  try {
    const teams = coordinator.getAvailableTeams();
    res.json(teams);
  } catch (error: any) {
    logger.error('Error fetching teams:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check-in Management
app.post('/api/v1/checkin', async (req, res) => {
  try {
    await coordinator.checkIn(req.body);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error checking in:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/checkout', async (req, res) => {
  try {
    await coordinator.checkOut(req.body.userId);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error checking out:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/personnel/status', async (req, res) => {
  try {
    const personnel = coordinator.getAllCheckedIn();
    res.json(personnel);
  } catch (error: any) {
    logger.error('Error fetching personnel status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Medical Triage
app.post('/api/v1/medical/triage', async (req, res) => {
  try {
    await coordinator.triageCasualty(req.body);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error triaging casualty:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/medical/casualties', async (req, res) => {
  try {
    const casualties = coordinator.getCasualties(req.query.triage as string);
    res.json(casualties);
  } catch (error: any) {
    logger.error('Error fetching casualties:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/medical/ambulance/dispatch', async (req, res) => {
  try {
    await coordinator.dispatchAmbulance(req.body);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error dispatching ambulance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Real-time WebSocket handlers
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-incident', (incidentId: string) => {
    socket.join(`incident:${incidentId}`);
    logger.info(`Socket ${socket.id} joined incident ${incidentId}`);
  });

  socket.on('leave-incident', (incidentId: string) => {
    socket.leave(`incident:${incidentId}`);
    logger.info(`Socket ${socket.id} left incident ${incidentId}`);
  });

  socket.on('location-update', (data) => {
    coordinator.handleLocationUpdate(data);
  });

  socket.on('status-update', (data) => {
    coordinator.handleStatusUpdate(data);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Start server
httpServer.listen(port, () => {
  logger.info(`Emergency Response Service listening on port ${port}`);
});

export default app;
