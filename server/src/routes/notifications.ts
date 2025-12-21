
import express from 'express';
import { NotificationService } from '../notifications/NotificationService.js';
import { MessagingService } from '../messaging/MessagingService.js';
import { UserPreferences } from '../notifications/types.js';

const router = express.Router();

// Middleware to get services from app.locals or create new instances
const getServices = (req: express.Request) => {
  const notificationService = req.app.locals.notificationService as NotificationService || new NotificationService();
  const messagingService = req.app.locals.messagingService as MessagingService;
  return { notificationService, messagingService };
};

// --- Preferences (Legacy) ---

router.get('/preferences', async (req, res) => {
  // @ts-ignore
  const userId = req.user?.id;
  if (!userId) return res.status(401).send('Unauthorized');

  const { notificationService } = getServices(req);

  try {
    const preferences = await notificationService.getPreferences(userId);
    res.json(preferences || {});
  } catch (err) {
    res.status(500).send('Error fetching preferences');
  }
});

router.post('/preferences', async (req, res) => {
  // @ts-ignore
  const userId = req.user?.id;
  if (!userId) return res.status(401).send('Unauthorized');

  const { notificationService } = getServices(req);
  const prefs = req.body as UserPreferences;

  try {
    await notificationService.savePreferences(userId, prefs);
    res.status(200).send('OK');
  } catch (err) {
    res.status(500).send('Error saving preferences');
  }
});

// --- Messaging ---

router.post('/messages', async (req, res) => {
  // @ts-ignore
  const userId = req.user?.id;
  if (!userId) return res.status(401).send('Unauthorized');

  const { messagingService } = getServices(req);
  if (!messagingService) return res.status(503).send('Messaging service unavailable');

  const { recipientId, content } = req.body;

  try {
    const message = await messagingService.sendMessage({
      senderId: userId,
      recipientId,
      content
    });
    res.json(message);
  } catch (err) {
    res.status(500).send('Error sending message');
  }
});

router.get('/messages/:otherUserId', async (req, res) => {
  // @ts-ignore
  const userId = req.user?.id;
  if (!userId) return res.status(401).send('Unauthorized');

  const { messagingService } = getServices(req);
  if (!messagingService) return res.status(503).send('Messaging service unavailable');

  const { otherUserId } = req.params;

  try {
    const messages = await messagingService.getMessages(userId, otherUserId);
    res.json(messages);
  } catch (err) {
    res.status(500).send('Error fetching messages');
  }
});

// --- New Endpoints ---

// GET /?unreadOnly=&cursor=
router.get('/', async (req, res) => {
    const user = (req as any).user;
    const userId = user?.id || user?.sub;
    const tenantId = user?.tenant_id || user?.tenantId;

    if (!userId || !tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Missing user or tenant context' });
    }

    const unreadOnly = req.query.unreadOnly === 'true';
    const cursor = req.query.cursor as string;

    const { notificationService } = getServices(req);

    try {
        const notifications = await notificationService.listNotifications(tenantId, userId, unreadOnly, cursor);
        res.json(notifications);
    } catch (err) {
        console.error('List notifications error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /:id/read
router.post('/:id/read', async (req, res) => {
    const user = (req as any).user;
    const userId = user?.id || user?.sub;
    const tenantId = user?.tenant_id || user?.tenantId;

    if (!userId || !tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { notificationService } = getServices(req);

    try {
        await notificationService.markAsReadV2(req.params.id, tenantId, userId);
        res.json({ success: true });
    } catch (err) {
        console.error('Mark read error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /type-preferences
router.get('/type-preferences', async (req, res) => {
    const user = (req as any).user;
    const userId = user?.id || user?.sub;
    const tenantId = user?.tenant_id || user?.tenantId;

    if (!userId || !tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { notificationService } = getServices(req);

    try {
        const prefs = await notificationService.getTypePreferences(tenantId, userId);
        res.json(prefs);
    } catch (err) {
        console.error('Get preferences error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /type-preferences
router.post('/type-preferences', async (req, res) => {
    const user = (req as any).user;
    const userId = user?.id || user?.sub;
    const tenantId = user?.tenant_id || user?.tenantId;

    if (!userId || !tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, enabled } = req.body;
    if (!type || typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid input. Required: type (string), enabled (boolean)' });
    }

    const { notificationService } = getServices(req);

    try {
        await notificationService.updateTypePreference(tenantId, userId, type, enabled);
        res.json({ success: true });
    } catch (err) {
        console.error('Update preference error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
