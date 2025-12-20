import { Message, SendMessagePayload } from './types.js';
import { MessagingRepo } from './MessagingRepo.js';
import pino from 'pino';

const logger = pino({ name: 'MessagingService' });

export class MessagingService {
  private repo: MessagingRepo;

  constructor() {
    this.repo = new MessagingRepo();
  }

  // Used for mocking
  setRepo(repo: MessagingRepo) {
    this.repo = repo;
  }

  async sendMessage(payload: SendMessagePayload): Promise<Message> {
    logger.info({ payload }, 'Sending message');

    try {
      const message = await this.repo.create(payload);
      // Future: emit socket event, send push notification via NotificationService, etc.
      return message;
    } catch (err) {
        logger.error({ err, payload }, 'Error sending message');
        throw err;
    }
  }

  async getMessages(userId: string, otherUserId: string): Promise<Message[]> {
    return this.repo.getHistory(userId, otherUserId);
  }
}
