"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingService = void 0;
const MessagingRepo_js_1 = require("./MessagingRepo.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'MessagingService' });
class MessagingService {
    repo;
    constructor() {
        this.repo = new MessagingRepo_js_1.MessagingRepo();
    }
    // Used for mocking
    setRepo(repo) {
        this.repo = repo;
    }
    async sendMessage(payload) {
        logger.info({ payload }, 'Sending message');
        try {
            const message = await this.repo.create(payload);
            // Future: emit socket event, send push notification via NotificationService, etc.
            return message;
        }
        catch (err) {
            logger.error({ err, payload }, 'Error sending message');
            throw err;
        }
    }
    async getMessages(userId, otherUserId) {
        return this.repo.getHistory(userId, otherUserId);
    }
}
exports.MessagingService = MessagingService;
