import { jest } from '@jest/globals';

const mockCompletion = {
  id: 'mock-completion-id',
  object: 'chat.completion',
  created: Date.now(),
  model: 'gpt-4',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'Mock response',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30,
  },
};

const mockEmbedding = {
  object: 'list',
  data: [
    {
      object: 'embedding',
      embedding: new Array(1536).fill(0),
      index: 0,
    },
  ],
  model: 'text-embedding-ada-002',
  usage: {
    prompt_tokens: 8,
    total_tokens: 8,
  },
};

export class OpenAI {
  chat = {
    completions: {
      create: jest.fn().mockResolvedValue(mockCompletion),
    },
  };

  embeddings = {
    create: jest.fn().mockResolvedValue(mockEmbedding),
  };

  completions = {
    create: jest.fn().mockResolvedValue(mockCompletion),
  };

  models = {
    list: jest.fn().mockResolvedValue({ data: [] }),
    retrieve: jest.fn().mockResolvedValue({ id: 'gpt-4' }),
  };

  images = {
    generate: jest.fn().mockResolvedValue({ data: [] }),
  };

  audio = {
    transcriptions: {
      create: jest.fn().mockResolvedValue({ text: 'transcribed text' }),
    },
  };

  files = {
    create: jest.fn().mockResolvedValue({ id: 'file-id' }),
    list: jest.fn().mockResolvedValue({ data: [] }),
    retrieve: jest.fn().mockResolvedValue({ id: 'file-id' }),
    del: jest.fn().mockResolvedValue({ deleted: true }),
  };
}

export default OpenAI;
