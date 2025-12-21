import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { CollabManager } from '../src/managers/CollabManager';
import { PostgresPersistence } from '../src/managers/PostgresPersistence';
import * as Y from 'yjs';

// Mock PostgresPersistence
jest.mock('../src/managers/PostgresPersistence', () => {
  return {
    PostgresPersistence: jest.fn().mockImplementation(() => ({
      load: jest.fn(),
      save: jest.fn(),
      init: jest.fn(),
      close: jest.fn(),
    })),
  };
});

describe('CollabManager', () => {
  let collabManager: CollabManager;
  let mockPersistence: any;

  beforeEach(() => {
    mockPersistence = new PostgresPersistence('mock-url');
    mockPersistence.load.mockResolvedValue(null);
    mockPersistence.save.mockResolvedValue(undefined);
    collabManager = new CollabManager(mockPersistence);
  });

  it('should load doc from persistence', async () => {
    const docName = 'test-doc';
    const doc = await collabManager.getDoc(docName);
    expect(doc).toBeDefined();
    expect(mockPersistence.load).toHaveBeenCalledWith(docName);
  });

  it('should sync with client having permissions', async () => {
    const docName = 'test-doc';
    const socket: any = {
      join: jest.fn(),
      emit: jest.fn(),
      user: { permissions: ['case:read'], roles: [], userId: 'user1' }
    };

    await collabManager.handleSync(socket, docName, new Uint8Array([0]));

    expect(socket.join).toHaveBeenCalledWith(docName);
    expect(socket.emit).toHaveBeenCalledWith('collab:sync_response', expect.anything());
  });

  it('should reject client without permissions', async () => {
    const docName = 'test-doc';
    const socket: any = {
      join: jest.fn(),
      emit: jest.fn(),
      user: { permissions: [], roles: [], userId: 'user2' }
    };

    await collabManager.handleSync(socket, docName, new Uint8Array([0]));

    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('system:error', expect.objectContaining({ code: 'UNAUTHORIZED' }));
  });

  it('should save doc on update', async () => {
    jest.useFakeTimers();
    const docName = 'test-doc';
    const doc = await collabManager.getDoc(docName);

    doc.getText('notes').insert(0, 'hello');

    jest.runAllTimers();

    expect(mockPersistence.save).toHaveBeenCalled();
    const [name, update, json] = mockPersistence.save.mock.calls[0];
    expect(name).toBe(docName);
    expect(update).toBeInstanceOf(Uint8Array);
    expect(json).toBeDefined();

    jest.useRealTimers();
  });
});
