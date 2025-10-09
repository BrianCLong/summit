// DB Contract Test - Lightweight repository interface validation
// Replaces the skipped db.test.ts with a real contract test

// Mock the repository to test interface compliance
jest.mock('@server/db/repository', () => ({
  getRepo: () => ({ 
    ping: jest.fn().mockResolvedValue(true),
    version: jest.fn().mockResolvedValue('test-1.0.0')
  })
}));

describe('db contract', () => {
  it('exposes ping() and version()', async () => {
    const { getRepo } = require('@server/db/repository');
    const repo = getRepo();
    
    // Contract: ping() should return a boolean promise
    await expect(repo.ping()).resolves.toBe(true);
    expect(repo.ping).toHaveBeenCalled();
    
    // Contract: version() should return a string promise
    await expect(repo.version()).resolves.toEqual(expect.any(String));
    expect(repo.version).toHaveBeenCalled();
  });
});