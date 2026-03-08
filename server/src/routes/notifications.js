"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// Middleware to get services from app.locals
const getServices = (req) => {
    const notificationService = req.app.locals.notificationService;
    // Ideally MessagingService should also be in app.locals, but for now we instantiate or getting it from somewhere
    // Actually, let's put it in app.locals in app.ts
    const messagingService = req.app.locals.messagingService;
    return { notificationService, messagingService };
};
// --- Preferences ---
router.get('/preferences', async (req, res) => {
    const userId = req.user?.id; // Assuming auth middleware populates this
    if (!userId)
        return res.status(401).send('Unauthorized');
    const { notificationService } = getServices(req);
    try {
        const preferences = await notificationService.getPreferences(userId);
        res.json(preferences || {});
    }
    catch (err) {
        res.status(500).send('Error fetching preferences');
    }
});
router.post('/preferences', async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).send('Unauthorized');
    const { notificationService } = getServices(req);
    const prefs = req.body;
    try {
        await notificationService.savePreferences(userId, prefs);
        res.status(200).send('OK');
    }
    catch (err) {
        res.status(500).send('Error saving preferences');
    }
});
// --- Messaging ---
router.post('/messages', async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).send('Unauthorized');
    const { messagingService } = getServices(req);
    const { recipientId, content } = req.body;
    try {
        const message = await messagingService.sendMessage({
            senderId: userId,
            recipientId,
            content
        });
        res.json(message);
    }
    catch (err) {
        res.status(500).send('Error sending message');
    }
});
router.get('/messages/:otherUserId', async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).send('Unauthorized');
    const { messagingService } = getServices(req);
    const { otherUserId } = req.params;
    try {
        const messages = await messagingService.getMessages(userId, otherUserId);
        res.json(messages);
    }
    catch (err) {
        res.status(500).send('Error fetching messages');
    }
});
exports.default = router;
