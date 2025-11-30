import { z } from 'zod';
import { DeliveryInstruction, DeliveryChannel, ReportRequest, ReportTemplate, ReportFormat } from './types';

const deliveryChannelEnum = z.enum(['email', 'slack', 'webhook']);

const emailConfigSchema = z.object({
  to: z.array(z.string().email()).nonempty('email recipients are required'),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
});

const slackConfigSchema = z.object({
  webhookUrl: z.string().url('slack webhook must be a valid URL'),
  text: z.string().optional(),
});

const webhookConfigSchema = z.object({
  url: z.string().url('webhook url must be a valid URL'),
  headers: z.record(z.string()).optional(),
  payload: z.record(z.unknown()).optional(),
});

const deliveryInstructionSchema = z
  .object({
    channels: z.array(deliveryChannelEnum).nonempty('at least one delivery channel is required'),
    email: emailConfigSchema.optional(),
    slack: slackConfigSchema.optional(),
    webhook: webhookConfigSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const channelConfigs: Record<DeliveryChannel, boolean> = {
      email: !!value.email,
      slack: !!value.slack,
      webhook: !!value.webhook,
    };

    for (const channel of value.channels) {
      if (!channelConfigs[channel]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['channels'],
          message: `${channel} delivery config is required when channel is enabled`,
        });
      }
    }
  });

const reportFormatEnum = z.enum(['json', 'csv', 'pdf', 'xlsx', 'docx', 'pptx', 'txt']);

const reportTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  content: z.string().min(1, 'template content is required'),
  format: reportFormatEnum,
  defaultWatermark: z.string().optional(),
});

const reportRequestSchema = z.object({
  template: reportTemplateSchema,
  context: z.record(z.unknown()),
  watermark: z.string().optional(),
  recipients: deliveryInstructionSchema.optional(),
});

export function validateReportRequest(request: ReportRequest): ReportRequest {
  return reportRequestSchema.parse(request);
}

export function validateTemplate(template: ReportTemplate): ReportTemplate {
  return reportTemplateSchema.parse(template);
}

export function validateDeliveryInstruction(
  instruction: DeliveryInstruction | undefined,
): DeliveryInstruction | undefined {
  if (!instruction) return undefined;
  return deliveryInstructionSchema.parse(instruction);
}

export const reportFormats: readonly ReportFormat[] = reportFormatEnum.options;
