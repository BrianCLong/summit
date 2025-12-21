import { InternalCommsService } from './InternalCommsService.js';
import { Communication, CommsAudience, CommsStatus, CommsTier, CommsTemplate } from './types.js';
import { ICommsRepo } from './repo/CommsRepo.js';

class MockCommsRepo implements ICommsRepo {
    private comms = new Map<string, Communication>();
    private templates = new Map<string, CommsTemplate>();

    async createDraft(comm: Communication): Promise<Communication> {
        this.comms.set(comm.id, comm);
        return comm;
    }
    async getCommunication(id: string): Promise<Communication | null> {
        return this.comms.get(id) || null;
    }
    async getCommunications(filter?: { status?: CommsStatus; tier?: CommsTier }): Promise<Communication[]> {
        return Array.from(this.comms.values());
    }
    async updateCommunication(comm: Communication): Promise<Communication> {
        this.comms.set(comm.id, comm);
        return comm;
    }
    async createTemplate(template: CommsTemplate): Promise<CommsTemplate> {
        this.templates.set(template.id, template);
        return template;
    }
    async getTemplates(): Promise<CommsTemplate[]> {
        return Array.from(this.templates.values());
    }
}

describe('InternalCommsService', () => {
  let service: InternalCommsService;
  let mockRepo: MockCommsRepo;

  beforeEach(() => {
    mockRepo = new MockCommsRepo();
    service = InternalCommsService.getInstance();
    // Inject mock repo via _resetForTesting or just use new instance logic if strictly unit testing
    service._resetForTesting(mockRepo);
  });

  describe('Communications Lifecycle', () => {
    it('should create a draft communication', async () => {
      const comm = await service.createDraft({
        title: 'Test Update',
        content: 'This is a test.',
        tier: CommsTier.ROUTINE,
        audience: CommsAudience.EMPLOYEES,
        authorId: 'user1'
      });

      expect(comm).toBeDefined();
      expect(comm.id).toBeDefined();
      expect(comm.status).toBe(CommsStatus.DRAFT);
      expect(comm.version).toBe(1);
    });

    it('should submit a draft for approval', async () => {
      const comm = await service.createDraft({
        title: 'Test Update',
        content: 'This is a test.',
        tier: CommsTier.ROUTINE,
        audience: CommsAudience.EMPLOYEES,
        authorId: 'user1'
      });

      const updated = await service.submitForApproval(comm.id, 'user1');
      expect(updated.status).toBe(CommsStatus.PENDING_APPROVAL);
      expect(updated.version).toBe(2);
    });

    it('should approve a pending communication', async () => {
      const comm = await service.createDraft({
        title: 'Test Update',
        content: 'This is a test.',
        tier: CommsTier.ROUTINE,
        audience: CommsAudience.EMPLOYEES,
        authorId: 'user1'
      });
      await service.submitForApproval(comm.id, 'user1');

      const approved = await service.approve(comm.id, 'approver1');
      expect(approved.status).toBe(CommsStatus.APPROVED);
      expect(approved.approverId).toBe('approver1');
    });

    it('should publish an approved communication', async () => {
      const comm = await service.createDraft({
        title: 'Test Update',
        content: 'This is a test.',
        tier: CommsTier.ROUTINE,
        audience: CommsAudience.EMPLOYEES,
        authorId: 'user1'
      });
      await service.submitForApproval(comm.id, 'user1');
      await service.approve(comm.id, 'approver1');

      const published = await service.publish(comm.id, 'publisher1');
      expect(published.status).toBe(CommsStatus.PUBLISHED);
      expect(published.publishedAt).toBeDefined();
    });

    it('should fail to publish if not approved', async () => {
      const comm = await service.createDraft({
        title: 'Test Update',
        content: 'This is a test.',
        tier: CommsTier.ROUTINE,
        audience: CommsAudience.EMPLOYEES,
        authorId: 'user1'
      });

      await expect(service.publish(comm.id, 'publisher1')).rejects.toThrow('Communication must be approved before publishing');
    });
  });

  describe('Templates', () => {
    it('should create and retrieve templates', async () => {
      const template = await service.createTemplate({
        name: 'Weekly Update',
        tier: CommsTier.ROUTINE,
        audience: CommsAudience.EMPLOYEES,
        contentTemplate: 'Hello {{name}}, here is the update.'
      });

      const templates = await service.getTemplates();
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe(template.id);
    });
  });
});
