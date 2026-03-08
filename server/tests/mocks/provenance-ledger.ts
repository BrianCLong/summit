import { jest } from '@jest/globals';

export const provenanceLedger = {
  getEntries: jest.fn(),
  addEntry: jest.fn(),
  getEntry: jest.fn(),
  deleteEntry: jest.fn(),
  appendEntry: jest.fn(),
  recordEvent: jest.fn(),
  getHistory: jest.fn(),
  createTransaction: jest.fn(),
};

export class ProvenanceLedgerV2 {
  public static getInstance = jest.fn(() => provenanceLedger);
}
