import { emailTemplateResolvers } from '../notifications';
import { emailTemplateService } from '../../../services/emailTemplates';
import { EmailTemplateRecord } from '../../../services/emailTemplates/types';

jest.mock('../../../services/emailTemplates', () => ({
  emailTemplateService: {
    listTemplates: jest.fn(),
    getTemplate: jest.fn(),
    upsertTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    renderTemplate: jest.fn(),
  },
}));

describe('emailTemplateResolvers', () => {
  const ctx = {
    user: {
      id: 'user-1',
      tenantId: 'tenant-1',
      role: 'ADMIN',
    },
  };

  const baseTemplate: EmailTemplateRecord = {
    id: 'tmpl-1',
    tenantId: 'tenant-1',
    key: 'welcome',
    subjectTemplate: 'Hi',
    bodyTemplate: '<p>Hi</p>',
    description: null,
    branding: {},
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists templates for tenant', async () => {
    (emailTemplateService.listTemplates as jest.Mock).mockResolvedValue([baseTemplate]);

    const result = await emailTemplateResolvers.Query.emailTemplates(
      {},
      { tenantId: 'tenant-1' },
      ctx,
    );

    expect(emailTemplateService.listTemplates).toHaveBeenCalledWith('tenant-1', undefined);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'tmpl-1', tenantId: 'tenant-1', key: 'welcome' });
    expect(result[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('prevents cross-tenant access for viewers', async () => {
    const viewerCtx = { user: { id: 'user-2', tenantId: 'tenant-1', role: 'viewer' } };
    await expect(
      emailTemplateResolvers.Mutation.upsertEmailTemplate(
        {},
        {
          tenantId: 'tenant-2',
          input: { key: 'welcome', subjectTemplate: 'Hello', bodyTemplate: 'Body' },
        },
        viewerCtx,
      ),
    ).rejects.toThrow('forbidden');
  });

  it('renders template through service', async () => {
    (emailTemplateService.renderTemplate as jest.Mock).mockResolvedValue({
      subject: 'Subject',
      html: '<p>Hello</p>',
      text: 'Hello',
      branding: { companyName: 'Summit' },
    });

    const result = await emailTemplateResolvers.Mutation.renderEmailTemplate(
      {},
      {
        tenantId: 'tenant-1',
        key: 'welcome',
        input: { context: { user: { name: 'Ada' } }, brandOverrides: { primaryColor: '#fff' } },
      },
      ctx,
    );

    expect(emailTemplateService.renderTemplate).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      key: 'welcome',
      context: { user: { name: 'Ada' } },
      brandOverrides: { primaryColor: '#fff' },
    });
    expect(result).toEqual({
      subject: 'Subject',
      html: '<p>Hello</p>',
      text: 'Hello',
      branding: {
        companyName: 'Summit',
        logoUrl: null,
        primaryColor: null,
        accentColor: null,
        supportEmail: null,
        footerText: null,
      },
    });
  });
});
