"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportFormats = void 0;
exports.validateReportRequest = validateReportRequest;
exports.validateTemplate = validateTemplate;
exports.validateDeliveryInstruction = validateDeliveryInstruction;
const zod_1 = require("zod");
const deliveryChannelEnum = zod_1.z.enum(['email', 'slack', 'webhook']);
const emailConfigSchema = zod_1.z.object({
    to: zod_1.z.array(zod_1.z.string().email()).nonempty('email recipients are required'),
    cc: zod_1.z.array(zod_1.z.string().email()).optional(),
    bcc: zod_1.z.array(zod_1.z.string().email()).optional(),
    subject: zod_1.z.string().optional(),
    body: zod_1.z.string().optional(),
});
const slackConfigSchema = zod_1.z.object({
    webhookUrl: zod_1.z.string().url('slack webhook must be a valid URL'),
    text: zod_1.z.string().optional(),
});
const webhookConfigSchema = zod_1.z.object({
    url: zod_1.z.string().url('webhook url must be a valid URL'),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
    payload: zod_1.z.record(zod_1.z.unknown()).optional(),
});
const deliveryInstructionSchema = zod_1.z
    .object({
    channels: zod_1.z.array(deliveryChannelEnum).nonempty('at least one delivery channel is required'),
    email: emailConfigSchema.optional(),
    slack: slackConfigSchema.optional(),
    webhook: webhookConfigSchema.optional(),
})
    .superRefine((value, ctx) => {
    const channelConfigs = {
        email: !!value.email,
        slack: !!value.slack,
        webhook: !!value.webhook,
    };
    for (const channel of value.channels) {
        if (!channelConfigs[channel]) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['channels'],
                message: `${channel} delivery config is required when channel is enabled`,
            });
        }
    }
});
const reportFormatEnum = zod_1.z.enum(['json', 'csv', 'pdf', 'xlsx', 'docx', 'pptx', 'txt']);
const reportTemplateSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    content: zod_1.z.string().min(1, 'template content is required'),
    format: reportFormatEnum,
    defaultWatermark: zod_1.z.string().optional(),
});
const reportRequestSchema = zod_1.z.object({
    template: reportTemplateSchema,
    context: zod_1.z.record(zod_1.z.unknown()),
    watermark: zod_1.z.string().optional(),
    recipients: deliveryInstructionSchema.optional(),
});
function validateReportRequest(request) {
    return reportRequestSchema.parse(request);
}
function validateTemplate(template) {
    return reportTemplateSchema.parse(template);
}
function validateDeliveryInstruction(instruction) {
    if (!instruction)
        return undefined;
    return deliveryInstructionSchema.parse(instruction);
}
exports.reportFormats = reportFormatEnum.options;
