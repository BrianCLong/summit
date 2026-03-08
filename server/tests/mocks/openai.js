"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAI = void 0;
const globals_1 = require("@jest/globals");
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
class OpenAI {
    chat = {
        completions: {
            create: globals_1.jest.fn().mockResolvedValue(mockCompletion),
        },
    };
    embeddings = {
        create: globals_1.jest.fn().mockResolvedValue(mockEmbedding),
    };
    completions = {
        create: globals_1.jest.fn().mockResolvedValue(mockCompletion),
    };
    models = {
        list: globals_1.jest.fn().mockResolvedValue({ data: [] }),
        retrieve: globals_1.jest.fn().mockResolvedValue({ id: 'gpt-4' }),
    };
    images = {
        generate: globals_1.jest.fn().mockResolvedValue({ data: [] }),
    };
    audio = {
        transcriptions: {
            create: globals_1.jest.fn().mockResolvedValue({ text: 'transcribed text' }),
        },
    };
    files = {
        create: globals_1.jest.fn().mockResolvedValue({ id: 'file-id' }),
        list: globals_1.jest.fn().mockResolvedValue({ data: [] }),
        retrieve: globals_1.jest.fn().mockResolvedValue({ id: 'file-id' }),
        del: globals_1.jest.fn().mockResolvedValue({ deleted: true }),
    };
}
exports.OpenAI = OpenAI;
exports.default = OpenAI;
