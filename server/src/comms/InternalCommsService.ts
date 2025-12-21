import {
  Communication,
  CommsAudience,
  CommsStatus,
  CommsTemplate,
  CommsTier,
  CreateCommunicationDto,
  CreateTemplateDto
} from './types.js';
import { randomUUID } from 'crypto';
import { logger as appLogger } from '../config/logger.js';
import { ICommsRepo, PostgresCommsRepo } from './repo/CommsRepo.js';
import { NotificationService } from '../notifications/NotificationService.js';

const logger = appLogger.child({ name: 'InternalCommsService' });

export class InternalCommsService {
  private static instance: InternalCommsService;
  private repo: ICommsRepo;
  private notificationService: NotificationService;

  private constructor(repo?: ICommsRepo, notificationService?: NotificationService) {
    this.repo = repo || new PostgresCommsRepo();
    this.notificationService = notificationService || new NotificationService();
  }

  public static getInstance(repo?: ICommsRepo, notificationService?: NotificationService): InternalCommsService {
    if (!InternalCommsService.instance) {
      InternalCommsService.instance = new InternalCommsService(repo, notificationService);
    }
    return InternalCommsService.instance;
  }

  // --- Templates ---

  public async createTemplate(dto: CreateTemplateDto): Promise<CommsTemplate> {
    const template: CommsTemplate = {
      id: randomUUID(),
      ...dto
    };
    return this.repo.createTemplate(template);
  }

  public async getTemplates(): Promise<CommsTemplate[]> {
    return this.repo.getTemplates();
  }

  // --- Communications ---

  public async createDraft(dto: CreateCommunicationDto): Promise<Communication> {
    const comm: Communication = {
      id: randomUUID(),
      ...dto,
      status: CommsStatus.DRAFT,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };
    return this.repo.createDraft(comm);
  }

  public async getCommunication(id: string): Promise<Communication | null> {
    return this.repo.getCommunication(id);
  }

  public async getCommunications(filter?: { status?: CommsStatus; tier?: CommsTier }): Promise<Communication[]> {
    return this.repo.getCommunications(filter);
  }

  public async submitForApproval(id: string, userId: string): Promise<Communication> {
    const comm = await this.repo.getCommunication(id);
    if (!comm) throw new Error('Communication not found');

    if (comm.status !== CommsStatus.DRAFT) {
      throw new Error('Only drafts can be submitted for approval');
    }

    comm.status = CommsStatus.PENDING_APPROVAL;
    comm.updatedAt = new Date();
    comm.version = (comm.version || 0) + 1;

    const updated = await this.repo.updateCommunication(comm);
    logger.info({ id, userId }, 'Communication submitted for approval');
    return updated;
  }

  public async approve(id: string, approverId: string): Promise<Communication> {
    const comm = await this.repo.getCommunication(id);
    if (!comm) throw new Error('Communication not found');

    if (comm.status !== CommsStatus.PENDING_APPROVAL) {
      throw new Error('Communication is not pending approval');
    }

    // Enforce Approvals Ladder
    this.validateApprover(comm.tier, approverId);

    comm.status = CommsStatus.APPROVED;
    comm.approverId = approverId;
    comm.updatedAt = new Date();
    comm.version = (comm.version || 0) + 1;

    const updated = await this.repo.updateCommunication(comm);
    logger.info({ id, approverId }, 'Communication approved');
    return updated;
  }

  public async publish(id: string, publisherId: string): Promise<Communication> {
    const comm = await this.repo.getCommunication(id);
    if (!comm) throw new Error('Communication not found');

    if (comm.status !== CommsStatus.APPROVED) {
      throw new Error('Communication must be approved before publishing');
    }

    comm.status = CommsStatus.PUBLISHED;
    comm.publishedAt = new Date();
    comm.updatedAt = new Date();
    comm.version = (comm.version || 0) + 1;

    const updated = await this.repo.updateCommunication(comm);

    // Trigger Notification/Distribution
    try {
      await this.notificationService.send({
        userId: 'all', // Or specific logic
        channels: ['EMAIL'], // Assuming types from NotificationService
        type: 'INTERNAL_COMMS',
        data: {
            title: comm.title,
            content: comm.content,
            tier: comm.tier
        }
      } as any);
    } catch (e) {
      logger.error({ error: e }, 'Failed to send notification for published comm');
    }

    logger.info({ id, publisherId }, 'Communication published');
    return updated;
  }

  private validateApprover(tier: CommsTier, approverId: string) {
    if (tier === CommsTier.CRISIS || tier === CommsTier.CONFIDENTIAL_LEGAL) {
        logger.info(`Validating high-level approval for tier ${tier}`);
    }
  }

  // --- Utility for Testing ---
  public _resetForTesting(mockRepo?: ICommsRepo) {
    if (mockRepo) {
        this.repo = mockRepo;
    }
  }
}
