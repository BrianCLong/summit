const TemplateService = require('../src/services/TemplateService');

describe('TemplateService', () => {
  afterEach(() => {
    TemplateService.templates.clear();
  });

  it('creates and retrieves templates', () => {
    const tpl = TemplateService.createTemplate({
      name: 'Test',
      data: { graph: {} },
      scope: 'personal',
      ownerId: 'u1',
    });
    expect(tpl.id).toBeDefined();
    const fetched = TemplateService.getTemplate(tpl.id);
    expect(fetched.name).toBe('Test');
  });

  it('lists templates by scope', () => {
    const orgTpl = TemplateService.createTemplate({
      name: 'Org',
      data: {},
      scope: 'org',
    });
    TemplateService.createTemplate({
      name: 'Mine',
      data: {},
      scope: 'personal',
      ownerId: 'u2',
    });
    const orgList = TemplateService.listTemplates({ scope: 'org' });
    expect(orgList.find((t) => t.id === orgTpl.id)).toBeTruthy();
    const personalList = TemplateService.listTemplates({
      scope: 'personal',
      userId: 'u2',
    });
    expect(personalList).toHaveLength(1);
  });
});
