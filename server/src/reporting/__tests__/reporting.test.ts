import axios from 'axios';
import { jest } from '@jest/globals';
import { AccessControlService } from '../access-control';
import { DeliveryService } from '../delivery-service';
import { TemplateEngine } from '../template-engine';
import { ReportScheduler } from '../scheduler';
import { ReportingService } from '../service';
import { ReportRequest, ReportTemplate } from '../types';
import { VersionStore } from '../version-store';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const baseTemplate: ReportTemplate = {
  id: 'tpl-1',
  name: 'Executive Threat Brief',
  format: 'json',
  content: '{"entries": [ { "name": "alpha", "score": 95 } ]}',
};

const access = { userId: 'u-1', roles: ['analyst'] };
const rules = [
  { resource: 'report', action: 'view', roles: ['analyst', 'admin'] },
  { resource: 'report', action: 'deliver', roles: ['analyst', 'admin'] },
];

const noDeliverAccess = { userId: 'u-2', roles: ['viewer'] };
const limitedRules = [
  { resource: 'report', action: 'view', roles: ['viewer', 'analyst', 'admin'] },
  { resource: 'report', action: 'deliver', roles: ['analyst', 'admin'] },
];

function createService() {
  const transporter = { sendMail: jest.fn().mockResolvedValue({ messageId: 'm-1' }) } as any;
  const delivery = new DeliveryService(transporter);
  const accessControl = new AccessControlService(rules);
  const versions = new VersionStore();
  const engine = new TemplateEngine();
  return { delivery, accessControl, versions, engine, service: new ReportingService(accessControl, delivery, versions, engine) };
}

describe('TemplateEngine', () => {
  it('renders Jinja-style filters', () => {
    const engine = new TemplateEngine();
    const template: ReportTemplate = {
      ...baseTemplate,
      format: 'txt',
      content: 'Hello {{ name | uppercase }}',
    };
    const result = engine.render(template, { name: 'summit' });
    expect(result.rendered).toContain('SUMMIT');
  });
});

describe('ReportingService', () => {
  it('generates artifacts, records versions, and delivers to multiple channels', async () => {
    mockedAxios.post.mockResolvedValue({ status: 200 });
    const { service, versions, delivery } = createService();

    const request: ReportRequest = {
      template: baseTemplate,
      context: {},
      watermark: 'SUMMIT CONFIDENTIAL',
      recipients: {
        channels: ['email', 'slack', 'webhook'],
        email: { to: ['ops@summit.local'], subject: 'Daily Brief' },
        slack: { webhookUrl: 'https://hooks.slack.com/services/demo', text: 'Brief ready' },
        webhook: { url: 'https://api.summit.local/webhooks/report', payload: { channel: 'exec' } },
      },
    };

    const artifact = await service.generate(request, access);

    expect(artifact.format).toBe('json');
    const payload = JSON.parse(artifact.buffer.toString());
    expect(payload.watermark).toBe('SUMMIT CONFIDENTIAL');
    expect(versions.history(baseTemplate.id)).toHaveLength(1);
    expect(delivery['transporter'].sendMail).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(artifact.metadata?.delivery).toBeDefined();
  });

  it('rejects delivery attempts without sufficient role', async () => {
    const { service } = createService();
    const request: ReportRequest = {
      template: baseTemplate,
      context: {},
      recipients: { channels: ['email'], email: { to: ['ops@summit.local'] } },
    };

    await expect(service.generate(request, noDeliverAccess)).rejects.toThrow(
      /not permitted to deliver report/,
    );
  });

  it('validates delivery configuration matches requested channels', async () => {
    const accessControl = new AccessControlService(limitedRules);
    const versions = new VersionStore();
    const delivery = new DeliveryService({ sendMail: jest.fn() } as any);
    const service = new ReportingService(accessControl, delivery, versions, new TemplateEngine());

    const badRequest: ReportRequest = {
      template: baseTemplate,
      context: {},
      recipients: { channels: ['email'] },
    } as ReportRequest;

    await expect(service.generate(badRequest, access)).rejects.toThrow(/email delivery config/);
  });
});

describe('ReportScheduler', () => {
  it('registers and cancels cron-driven jobs', () => {
    const { service } = createService();
    const scheduler = new ReportScheduler(service);
    const job = {
      id: 'job-1',
      name: 'hourly-threat-watch',
      cron: '*/5 * * * * *',
      request: { template: baseTemplate, context: {} },
    };

    scheduler.schedule(job, access);
    expect(scheduler.activeJobs()).toContain('job-1');
    scheduler.cancel('job-1');
    expect(scheduler.activeJobs()).not.toContain('job-1');
  });

  it('rejects invalid cron expressions', () => {
    const { service } = createService();
    const scheduler = new ReportScheduler(service);

    const badJob = {
      id: 'bad',
      name: 'invalid',
      cron: 'not-a-cron',
      request: { template: baseTemplate, context: {} },
    };

    expect(() => scheduler.schedule(badJob, access)).toThrow(/Invalid cron expression/);
  });
});
