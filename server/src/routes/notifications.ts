import express from 'express';
import { NotificationService } from '../notifications/NotificationService.js';
import { MessagingService } from '../messaging/MessagingService.js';
import { UserPreferences } from '../notifications/types.js';

const router = express.Router();

// Middleware to get services from app.locals
const getServices = (req: express.Request) => {
  const notificationService = req.app.locals.notificationService as NotificationService;
  // Ideally MessagingService should also be in app.locals, but for now we instantiate or getting it from somewhere
  // Actually, let's put it in app.locals in app.ts
  const messagingService = req.app.locals.messagingService as MessagingService;
  return { notificationService, messagingService };
};

// --- Preferences ---

router.get('/preferences', async (req, res) => {
  // @ts-ignore
  const userId = req.user?.id; // Assuming auth middleware populates this
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
  const { otherUserId } = req.params;

  try {
    const messages = await messagingService.getMessages(userId, otherUserId);
    res.json(messages);
  } catch (err) {
    res.status(500).send('Error fetching messages');
  }
});

export default router;
