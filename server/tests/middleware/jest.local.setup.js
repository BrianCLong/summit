// Minimal setup for guardrails test
import { jest } from '@jest/globals';

jest.mock('prom-client', () => ({
  Histogram: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
  })),
  Counter: jest.fn().mockImplementation(() => ({
    inc: jest.fn(),
  })),
  Gauge: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
  })),
}));

jest.mock('../../src/db/pg', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
  },
}));
