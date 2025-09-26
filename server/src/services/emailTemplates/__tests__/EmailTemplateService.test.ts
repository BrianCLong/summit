import { EmailTemplateService } from '../EmailTemplateService';
import {
  EmailTemplateRecord,
  EmailTemplateRenderResult,
} from '../types';

describe('EmailTemplateService', () => {
  const tenantId = 'tenant-123';
  const templateKey = 'welcome';

  const baseTemplate: EmailTemplateRecord = {
    id: 'template-1',
    tenantId,
    key: templateKey,
    subjectTemplate: 'Welcome {{user.name}} to {{brand.companyName}}',
    bodyTemplate:
      '<h1 style="color:{{brand.primaryColor}}">Hello {{user.name}}</h1><p>{{brand.footerText}}</p>',
    description: 'Welcome email',
    branding: {
      companyName: 'Summit',
      primaryColor: '#111111',
      footerText: 'Thanks for joining us!',
    },
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  function createRepository(overrides: Partial<any> = {}) {
    return {
      list: jest.fn(),
      findByKey: jest.fn().mockResolvedValue(baseTemplate),
      upsert: jest.fn().mockResolvedValue(baseTemplate),
      delete: jest.fn().mockResolvedValue(true),
      ...overrides,
    };
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders subject and body with merged branding', async () => {
    const repository = createRepository();
    const service = new EmailTemplateService(repository as any);

    const result = (await service.renderTemplate({
      tenantId,
      key: templateKey,
      context: { user: { name: 'Ada Lovelace' } },
      brandOverrides: { primaryColor: '#ff0000' },
    })) as EmailTemplateRenderResult;

    expect(repository.findByKey).toHaveBeenCalledWith(tenantId, templateKey);
    expect(result.subject).toContain('Ada Lovelace');
    expect(result.subject).toContain('Summit');
    expect(result.html).toContain('#ff0000');
    expect(result.branding).toEqual({
      companyName: 'Summit',
      primaryColor: '#ff0000',
      footerText: 'Thanks for joining us!',
    });
    expect(result.text).toContain('Hello Ada Lovelace');
  });

  it('throws when template is missing', async () => {
    const repository = createRepository({ findByKey: jest.fn().mockResolvedValue(null) });
    const service = new EmailTemplateService(repository as any);

    await expect(
      service.renderTemplate({ tenantId, key: templateKey, context: { user: { name: 'Missing' } } }),
    ).rejects.toThrow(/not found/);
  });

  it('upserts template and clears cache for updates', async () => {
    const repository = createRepository();
    const service = new EmailTemplateService(repository as any);
    service.clearCache();

    const input = {
      key: templateKey,
      subjectTemplate: baseTemplate.subjectTemplate,
      bodyTemplate: baseTemplate.bodyTemplate,
      description: baseTemplate.description,
      branding: baseTemplate.branding,
    };

    const saved = await service.upsertTemplate(tenantId, input);

    expect(repository.upsert).toHaveBeenCalledWith(tenantId, input);
    expect(saved).toEqual(baseTemplate);
  });
});
