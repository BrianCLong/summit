import { createHash } from 'node:crypto';

import { calculateCost, estimateTokens, getModelById } from 'common-types';

function defaultTemplate(payload, metadata) {
  const header = `${metadata.id} synthesized response`;
  const objective = payload.objective ? `Objective: ${payload.objective}` : '';
  const mode = payload.mode ? `Mode: ${payload.mode}` : 'Mode: generate';
  const context = payload.context ? `Context: ${payload.context}` : '';
  const extras = payload.tools?.length
    ? `Tools: ${payload.tools.map((t) => t.name ?? 'tool').join(', ')}`
    : '';
  return [header, objective, mode, context, extras].filter(Boolean).join('\n');
}

function defaultCitations(payload) {
  const attachments = payload.attachments ?? [];
  return attachments.map((attachment) => {
    const uri = attachment.uri ?? attachment.id ?? 'attachment';
    const hash = createHash('sha256').update(uri).digest('hex');
    return {
      uri,
      hash,
      title: attachment.title ?? 'Attachment',
      retrievedAt: new Date().toISOString(),
    };
  });
}

function createTemplateAdapter(modelId, behaviour = {}) {
  const metadata = getModelById(modelId);
  if (!metadata) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  const template = behaviour.template ?? defaultTemplate;
  const citationBuilder = behaviour.citations ?? defaultCitations;
  const latency =
    behaviour.latency ??
    ((tokens) =>
      Math.max(45, Math.round(tokens * (metadata.local ? 0.6 : 1.5))));

  return {
    id: metadata.id,
    metadata,
    async generate(payload) {
      const prompt = payload.prompt ?? payload.objective ?? '';
      const tokensIn = estimateTokens(prompt);
      const text = template(payload, metadata);
      const tokensOut = Math.max(estimateTokens(text), 1);
      const cost = calculateCost(metadata, tokensIn, tokensOut);
      const totalTokens = tokensIn + tokensOut;
      return {
        text,
        tokensIn,
        tokensOut,
        usd: cost.usd,
        latencyMs: latency(totalTokens),
        model: metadata,
        citations: citationBuilder(payload),
      };
    },
  };
}

function mixtralTemplate(payload, metadata) {
  const objective = payload.objective ?? 'unspecified objective';
  const sections = [
    `Planner: ${metadata.id}`,
    `Objective: ${objective}`,
    'Phases:',
    '- Analyze policy inputs and constraints.',
    '- Draft backlog slices with acceptance criteria.',
    '- Prepare observability + rollback steps.',
  ];
  return sections.join('\n');
}

function llamaTemplate(payload, metadata) {
  return (
    `${metadata.id} condensed response for ${payload.objective ?? 'request'}\n` +
    'Lightweight reasoning path selected for rapid turnaround.'
  );
}

function qwenTemplate(payload, metadata) {
  const language = payload.language ?? 'en';
  return (
    `${metadata.id} multilingual handler (${language})\n` +
    'Response localized with governance hooks intact.'
  );
}

function falconTemplate(payload, metadata) {
  const attachmentSummary = (payload.attachments ?? [])
    .map(
      (attachment) =>
        `- ${attachment.type ?? 'file'} :: ${attachment.uri ?? 'resource'}`,
    )
    .join('\n');
  return [
    `${metadata.id} multimodal synthesis`,
    attachmentSummary || 'No attachments provided',
  ].join('\n');
}

function paidTemplate(payload, metadata) {
  return `${metadata.id} paid escape hatch activated. Objective: ${payload.objective ?? 'request'}.`;
}

export class ModelRegistry {
  constructor(adapters = []) {
    this.adapters = new Map();
    adapters.forEach((adapter) => this.register(adapter));
    if (this.adapters.size === 0) {
      this.registerDefaults();
    }
  }

  registerDefaults() {
    [
      createTemplateAdapter('mixtral-8x22b-instruct', {
        template: mixtralTemplate,
      }),
      createTemplateAdapter('llama-3-8b-instruct', { template: llamaTemplate }),
      createTemplateAdapter('qwen-14b-instruct', { template: qwenTemplate }),
      createTemplateAdapter('gemma-2-9b-it'),
      createTemplateAdapter('falcon-2-vlm', { template: falconTemplate }),
      createTemplateAdapter('gpt-4o-mini', {
        template: paidTemplate,
        citations: defaultCitations,
      }),
      createTemplateAdapter('grok-2', {
        template: paidTemplate,
        citations: defaultCitations,
      }),
    ].forEach((adapter) => this.register(adapter));
  }

  register(adapter) {
    this.adapters.set(adapter.id, adapter);
  }

  get(modelId) {
    return this.adapters.get(modelId);
  }

  list() {
    return Array.from(this.adapters.values()).map(
      (adapter) => adapter.metadata,
    );
  }

  async generate(modelId, payload) {
    const adapter = this.get(modelId);
    if (!adapter) {
      throw new Error(`Adapter not found for model ${modelId}`);
    }
    return adapter.generate(payload);
  }
}
