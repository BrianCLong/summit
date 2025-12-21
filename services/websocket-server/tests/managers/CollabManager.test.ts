
import { CollabManager } from '../../src/managers/CollabManager';
import { PostgresPersistence } from '../../src/managers/PostgresPersistence';
import { Server, Socket } from 'socket.io';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

// Mock dependencies
jest.mock('../../src/managers/PostgresPersistence');
jest.mock('socket.io');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('CollabManager', () => {
  let collabManager: CollabManager;
  let mockPersistence: jest.Mocked<PostgresPersistence>;
  let mockIo: jest.Mocked<Server>;
  let mockSocket: any;

  beforeEach(() => {
    mockPersistence = new PostgresPersistence() as any;
    mockIo = new Server() as any;
    collabManager = new CollabManager(mockIo, mockPersistence);

    mockSocket = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      rooms: new Set(),
      data: {
        user: { userId: 'user1' }
      }
    };

    mockPersistence.loadDocument.mockResolvedValue(null);
    mockPersistence.saveDocument.mockResolvedValue(undefined);
  });

  test('handleJoin sends sync step 1', async () => {
    await collabManager.handleJoin(mockSocket, 'room1');

    expect(mockSocket.emit).toHaveBeenCalledWith('collab:sync', expect.objectContaining({
      room: 'room1',
      buffer: expect.any(Uint8Array)
    }));
  });

  test('handleUpdate applies update and broadcasts', async () => {
    const doc = new Y.Doc();
    const update = Y.encodeStateAsUpdate(doc);

    await collabManager.handleUpdate(mockSocket, 'room1', update);

    expect(mockSocket.to).toHaveBeenCalledWith('room1');
    expect(mockSocket.emit).toHaveBeenCalledWith('collab:update', expect.objectContaining({
      room: 'room1',
      update: update
    }));
  });

  test('CRDT Merge Determinism', async () => {
    const room = 'merge-test';

    // Simulating two users
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    doc1.getText('text').insert(0, 'Hello');
    doc2.getText('text').insert(0, 'World');

    const update1 = Y.encodeStateAsUpdate(doc1);
    const update2 = Y.encodeStateAsUpdate(doc2);

    // Apply updates in different order
    const serverDoc = await (collabManager as any).getDoc(room);

    Y.applyUpdate(serverDoc, update1);
    Y.applyUpdate(serverDoc, update2);

    const finalContent = serverDoc.getText('text').toString();

    // Reset and try reverse order
    const serverDoc2 = new Y.Doc();
    Y.applyUpdate(serverDoc2, update2);
    Y.applyUpdate(serverDoc2, update1);

    expect(serverDoc2.getText('text').toString()).toBe(finalContent);
  });
});
