
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { searchAll } from '../src/search/search.js';

// Mock dependencies
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

jest.mock('../src/config/database.js', () => ({
  getPostgresPool: jest.fn(() => ({
    pool: {
        connect: jest.fn(),
        query: jest.fn(),
        end: jest.fn(),
    },
    query: jest.fn(),
  })),
  getNeo4jDriver: jest.fn(() => ({
    session: jest.fn(() => ({
      run: jest.fn(),
      close: jest.fn(),
    })),
  })),
}));

jest.mock('../src/services/EmbeddingService', () => {
    return jest.fn().mockImplementation(() => ({
        generateEmbedding: jest.fn().mockResolvedValue(new Array(3072).fill(0.1))
    }));
});

// Mock SynonymService completely to avoid import.meta issues in Jest
jest.mock('../src/services/SemanticSearchService.js', () => {
  return jest.fn().mockImplementation(() => ({
      searchCases: jest.fn().mockResolvedValue([]),
      searchDocs: jest.fn().mockResolvedValue([]),
      close: jest.fn(),
  }));
});

describe('Docs Search Integration', () => {
    it('should be defined', () => {
        expect(searchAll).toBeDefined();
    });
});
