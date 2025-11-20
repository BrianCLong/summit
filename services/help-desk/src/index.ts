/**
 * Help Desk API Service
 * REST API for enterprise support system
 */

import express, { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { TicketService } from '@summit/support-system';
import { KnowledgeBaseService } from '@summit/knowledge-base';
import { TrainingService } from '@summit/training-platform';
import { SLAManagementService } from '@summit/sla-management';
import { HealthMonitoringService } from '@summit/health-monitoring';

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty'
  } : undefined
});

// Initialize database connections
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'summit',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  max: 20
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

// Initialize services
const ticketService = new TicketService(pool, redis, logger);
const kbService = new KnowledgeBaseService(pool, logger);
const trainingService = new TrainingService(pool, logger);
const slaService = new SLAManagementService(pool, redis, logger);
const healthService = new HealthMonitoringService(pool, redis, logger);

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(pinoHttp({ logger }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    await redis.ping();
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
  }
});

// ============================================
// TICKET ROUTES
// ============================================

app.post('/api/tickets', async (req: Request, res: Response) => {
  try {
    const ticket = await ticketService.createTicket(req.body, req.user?.id);
    res.status(201).json(ticket);
  } catch (error: any) {
    logger.error({ error }, 'Failed to create ticket');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tickets/:id', async (req: Request, res: Response) => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error: any) {
    logger.error({ error }, 'Failed to get ticket');
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/tickets/:id', async (req: Request, res: Response) => {
  try {
    const ticket = await ticketService.updateTicket(req.params.id, req.body, req.user?.id);
    res.json(ticket);
  } catch (error: any) {
    logger.error({ error }, 'Failed to update ticket');
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tickets/:id/comments', async (req: Request, res: Response) => {
  try {
    const { content, isInternal, isSolution } = req.body;
    const comment = await ticketService.addComment(
      req.params.id,
      req.user?.id || 'system',
      content,
      isInternal,
      isSolution
    );
    res.status(201).json(comment);
  } catch (error: any) {
    logger.error({ error }, 'Failed to add comment');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tickets', async (req: Request, res: Response) => {
  try {
    const tickets = await ticketService.searchTickets(
      req.query as any,
      parseInt(req.query.limit as string) || 50,
      parseInt(req.query.offset as string) || 0
    );
    res.json(tickets);
  } catch (error: any) {
    logger.error({ error }, 'Failed to search tickets');
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// KNOWLEDGE BASE ROUTES
// ============================================

app.post('/api/kb/articles', async (req: Request, res: Response) => {
  try {
    const article = await kbService.createArticle(req.body);
    res.status(201).json(article);
  } catch (error: any) {
    logger.error({ error }, 'Failed to create article');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/kb/articles/:id', async (req: Request, res: Response) => {
  try {
    const article = await kbService.getArticleById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Increment view count
    await kbService.incrementViewCount(req.params.id);

    res.json(article);
  } catch (error: any) {
    logger.error({ error }, 'Failed to get article');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/kb/articles/slug/:slug', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || req.user?.tenantId;
    const article = await kbService.getArticleBySlug(req.params.slug, tenantId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    await kbService.incrementViewCount(article.id);

    res.json(article);
  } catch (error: any) {
    logger.error({ error }, 'Failed to get article');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/kb/articles', async (req: Request, res: Response) => {
  try {
    const articles = await kbService.searchArticles(req.query as any);
    res.json(articles);
  } catch (error: any) {
    logger.error({ error }, 'Failed to search articles');
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/kb/articles/:id/feedback', async (req: Request, res: Response) => {
  try {
    const { isHelpful } = req.body;
    await kbService.recordFeedback(req.params.id, isHelpful);
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error }, 'Failed to record feedback');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/kb/faqs', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || req.user?.tenantId;
    const category = req.query.category as string;
    const faqs = await kbService.getFAQsByCategory(tenantId, category);
    res.json(faqs);
  } catch (error: any) {
    logger.error({ error }, 'Failed to get FAQs');
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TRAINING ROUTES
// ============================================

app.get('/api/training/courses', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || req.user?.tenantId;
    const courses = await trainingService.getCourses(tenantId);
    res.json(courses);
  } catch (error: any) {
    logger.error({ error }, 'Failed to get courses');
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/training/enroll', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.body;
    const userId = req.user?.id || 'anonymous';
    const progress = await trainingService.enrollUser(userId, courseId);
    res.status(201).json(progress);
  } catch (error: any) {
    logger.error({ error }, 'Failed to enroll user');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/training/progress', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const progress = await trainingService.getUserProgress(userId);
    res.json(progress);
  } catch (error: any) {
    logger.error({ error }, 'Failed to get user progress');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/training/certifications', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const certifications = await trainingService.getUserCertifications(userId);
    res.json(certifications);
  } catch (error: any) {
    logger.error({ error }, 'Failed to get certifications');
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SLA ROUTES
// ============================================

app.get('/api/sla/metrics', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || req.user?.tenantId;
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);

    const metrics = await slaService.calculateSLAMetrics(tenantId, startDate, endDate);
    res.json(metrics);
  } catch (error: any) {
    logger.error({ error }, 'Failed to calculate SLA metrics');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sla/breaches', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || req.user?.tenantId;
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);

    const breaches = await slaService.getSLABreaches(tenantId, startDate, endDate);
    res.json(breaches);
  } catch (error: any) {
    logger.error({ error }, 'Failed to get SLA breaches');
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HEALTH MONITORING ROUTES
// ============================================

app.get('/api/health/status', async (req: Request, res: Response) => {
  try {
    const systemHealth = await healthService.getSystemHealth();
    res.json(systemHealth);
  } catch (error: any) {
    logger.error({ error }, 'Failed to get system health');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health/incidents', async (req: Request, res: Response) => {
  try {
    const incidents = await healthService.getActiveIncidents();
    res.json(incidents);
  } catch (error: any) {
    logger.error({ error }, 'Failed to get incidents');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health/incidents/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const incidents = await healthService.getIncidentHistory(limit);
    res.json(incidents);
  } catch (error: any) {
    logger.error({ error }, 'Failed to get incident history');
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/health/subscribe', async (req: Request, res: Response) => {
  try {
    const { email, componentIds } = req.body;
    await healthService.subscribeToUpdates(email, componentIds);
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error }, 'Failed to subscribe to updates');
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ error, path: req.path }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Help desk service started');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await pool.end();
  await redis.quit();
  process.exit(0);
});

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        tenantId: string;
        email: string;
        role: string;
      };
    }
  }
}
