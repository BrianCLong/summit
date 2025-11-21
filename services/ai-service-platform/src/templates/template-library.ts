/**
 * Template Library - Pre-built templates for instant service launch
 *
 * Enables partners to deploy standard AI services in minutes
 */

import type { ServiceTemplate } from '../types/index.js';

export class TemplateLibrary {
  private templates: Map<string, ServiceTemplate> = new Map();

  async loadBuiltInTemplates(): Promise<void> {
    const builtIn: ServiceTemplate[] = [
      // LLM Service Template
      {
        id: 'llm-inference',
        name: 'LLM Inference Service',
        description:
          'Deploy large language models with optimized inference, batching, and caching',
        category: 'llm',
        baseImage: 'ai-platform/llm-inference:latest',
        defaultConfig: {
          maxConcurrency: 50,
          timeoutMs: 60000,
          batchSize: 8,
          cacheEnabled: true,
        },
        requiredEnvVars: ['MODEL_NAME', 'HF_TOKEN'],
        optionalEnvVars: ['MAX_TOKENS', 'TEMPERATURE', 'TOP_P'],
        ports: [{ containerPort: 8080, protocol: 'TCP' }],
        volumes: [{ name: 'model-cache', mountPath: '/models', size: '50Gi' }],
      },

      // Document Processing Template
      {
        id: 'document-processor',
        name: 'Document Processing Service',
        description:
          'OCR, classification, and extraction from documents (PDF, images, scans)',
        category: 'vision',
        baseImage: 'ai-platform/document-processor:latest',
        defaultConfig: {
          maxConcurrency: 20,
          timeoutMs: 120000,
          supportedFormats: ['pdf', 'png', 'jpg', 'tiff'],
        },
        requiredEnvVars: ['STORAGE_BUCKET'],
        optionalEnvVars: ['OCR_LANGUAGE', 'CONFIDENCE_THRESHOLD'],
        ports: [{ containerPort: 8080, protocol: 'TCP' }],
        volumes: [{ name: 'temp-storage', mountPath: '/tmp/docs', size: '10Gi' }],
      },

      // NLP Pipeline Template
      {
        id: 'nlp-pipeline',
        name: 'NLP Pipeline Service',
        description:
          'Entity extraction, sentiment analysis, summarization, and classification',
        category: 'nlp',
        baseImage: 'ai-platform/nlp-pipeline:latest',
        defaultConfig: {
          maxConcurrency: 100,
          timeoutMs: 30000,
          pipelines: ['ner', 'sentiment', 'summarization'],
        },
        requiredEnvVars: [],
        optionalEnvVars: ['SPACY_MODEL', 'MAX_TEXT_LENGTH'],
        ports: [{ containerPort: 8080, protocol: 'TCP' }],
      },

      // Embedding Service Template
      {
        id: 'embedding-service',
        name: 'Vector Embedding Service',
        description:
          'Generate embeddings for text, images, or multimodal content',
        category: 'embedding',
        baseImage: 'ai-platform/embedding-service:latest',
        defaultConfig: {
          maxConcurrency: 200,
          timeoutMs: 10000,
          batchSize: 32,
          modelType: 'text',
        },
        requiredEnvVars: ['EMBEDDING_MODEL'],
        optionalEnvVars: ['NORMALIZE', 'DIMENSION'],
        ports: [{ containerPort: 8080, protocol: 'TCP' }],
      },

      // Prediction Service Template
      {
        id: 'prediction-service',
        name: 'ML Prediction Service',
        description:
          'Deploy custom ML models (sklearn, PyTorch, TensorFlow) with auto-scaling',
        category: 'prediction',
        baseImage: 'ai-platform/prediction-service:latest',
        defaultConfig: {
          maxConcurrency: 100,
          timeoutMs: 5000,
          framework: 'sklearn',
        },
        requiredEnvVars: ['MODEL_PATH'],
        optionalEnvVars: ['FEATURE_SCHEMA', 'PREPROCESSING_SCRIPT'],
        ports: [{ containerPort: 8080, protocol: 'TCP' }],
        volumes: [{ name: 'model-store', mountPath: '/models', size: '5Gi' }],
      },

      // RAG Pipeline Template
      {
        id: 'rag-pipeline',
        name: 'RAG Pipeline Service',
        description:
          'Retrieval-Augmented Generation with vector search and LLM integration',
        category: 'llm',
        baseImage: 'ai-platform/rag-pipeline:latest',
        defaultConfig: {
          maxConcurrency: 30,
          timeoutMs: 45000,
          vectorStore: 'pgvector',
          topK: 5,
        },
        requiredEnvVars: ['LLM_ENDPOINT', 'VECTOR_DB_URL'],
        optionalEnvVars: ['CHUNK_SIZE', 'OVERLAP', 'RERANKER'],
        ports: [{ containerPort: 8080, protocol: 'TCP' }],
      },

      // Agent Workflow Template
      {
        id: 'agent-workflow',
        name: 'AI Agent Workflow',
        description:
          'Multi-step agent with tool use, planning, and execution capabilities',
        category: 'workflow',
        baseImage: 'ai-platform/agent-workflow:latest',
        defaultConfig: {
          maxConcurrency: 10,
          timeoutMs: 300000,
          maxSteps: 20,
          tools: ['search', 'calculator', 'code_interpreter'],
        },
        requiredEnvVars: ['LLM_ENDPOINT', 'TOOL_CONFIG'],
        optionalEnvVars: ['MAX_ITERATIONS', 'MEMORY_TYPE'],
        ports: [{ containerPort: 8080, protocol: 'TCP' }],
      },
    ];

    for (const template of builtIn) {
      this.templates.set(template.id, template);
    }
  }

  async get(id: string): Promise<ServiceTemplate | undefined> {
    return this.templates.get(id);
  }

  async list(category?: string): Promise<ServiceTemplate[]> {
    const all = Array.from(this.templates.values());
    return category ? all.filter((t) => t.category === category) : all;
  }

  async createFromTemplate(
    templateId: string,
    overrides: Partial<ServiceTemplate>,
  ): Promise<ServiceTemplate> {
    const base = this.templates.get(templateId);
    if (!base) {
      throw new Error(`Template ${templateId} not found`);
    }

    return {
      ...base,
      ...overrides,
      id: `custom-${Date.now()}`,
    };
  }
}
