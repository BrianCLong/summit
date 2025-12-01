/**
 * Template Routes - Pre-built templates for rapid deployment
 */

import type { FastifyInstance } from 'fastify';

export async function templateRoutes(server: FastifyInstance) {
  // List all templates
  server.get('/', async (request) => {
    const { category } = request.query as { category?: string };
    const templates = await server.templateLibrary.list(category);
    return { templates, total: templates.length };
  });

  // Get template by ID
  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const template = await server.templateLibrary.get(id);
    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }
    return template;
  });

  // Create service from template (quick-start)
  server.post('/:id/create', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, config } = request.body as {
      name: string;
      config?: Record<string, unknown>;
    };

    const template = await server.templateLibrary.get(id);
    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    // Create service from template
    const service = await server.serviceRegistry.register({
      name,
      version: '1.0.0',
      description: `${template.name} - ${name}`,
      type: template.category as 'llm' | 'vision' | 'nlp' | 'prediction' | 'embedding' | 'custom',
      templateId: id,
      config: {
        ...template.defaultConfig,
        ...config,
      },
    });

    return reply.status(201).send({
      message: 'Service created from template',
      service,
      nextStep: 'POST /api/v1/deployments to deploy',
    });
  });
}
