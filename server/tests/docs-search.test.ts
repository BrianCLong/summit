
import { searchAll } from '../src/search/search';
import { ingestDocs } from '../src/jobs/ingest-docs';
import pino from 'pino';

// Mock dependencies
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

jest.mock('../src/services/EmbeddingService', () => {
    return jest.fn().mockImplementation(() => ({
        generateEmbedding: jest.fn().mockResolvedValue(new Array(3072).fill(0.1))
    }));
});

describe('Docs Search Integration', () => {
    it('should be defined', () => {
        expect(searchAll).toBeDefined();
    });

    it('should have ingest job', () => {
        expect(ingestDocs).toBeDefined();
    });
});
