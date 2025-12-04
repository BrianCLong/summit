
// server/src/lib/state/tests/state.test.ts

import { ConsistencyEngine, ConsistencyLevel } from '../consistency-engine';
import { GCounter, PNCounter, LWWRegister, ORSet, ConflictResolver } from '../conflict-resolver';
import { TwoPhaseCommitCoordinator, TransactionParticipant, SagaCoordinator, SagaAction } from '../distributed-transaction';
import { StateSyncClient } from '../state-sync';
import { WebSocket } from 'ws';

jest.mock('ws');

describe('State Management', () => {

  describe('ConsistencyEngine', () => {
    let engine: ConsistencyEngine;

    beforeEach(() => {
      engine = new ConsistencyEngine();
    });

    it('should handle strong consistency reads/writes', () => {
      engine.write('key', 'value', { consistency: ConsistencyLevel.Strong });
      const value = engine.read('key', { consistency: ConsistencyLevel.Strong });
      expect(value).toBe('value');
    });

    it('should handle session consistency', () => {
      const sessionId = 'session1';
      engine.write('key', 'sessionValue', { consistency: ConsistencyLevel.Session, sessionId });
      const value = engine.read('key', { consistency: ConsistencyLevel.Session, sessionId });
      expect(value).toBe('sessionValue');
    });

    it('should enforce monotonic reads', () => {
      expect(() => engine.enforceMonotonicReads(2, 1)).toThrow('Monotonic read violation detected.');
    });
  });

  describe('ConflictResolver', () => {
    let resolver: ConflictResolver;

    beforeEach(() => {
      resolver = new ConflictResolver();
    });

    it('should merge G-Counters', () => {
      const counterA = new GCounter('A');
      counterA.increment(5);
      const counterB = new GCounter('B');
      counterB.increment(3);
      const merged = counterA.merge(counterB);
      expect(merged.value).toBe(8);
    });

    it('should merge PN-Counters', () => {
      const counterA = new PNCounter('A');
      counterA.increment(10);
      counterA.decrement(2);
      const counterB = new PNCounter('B');
      counterB.increment(5);
      counterB.decrement(8);
      const merged = counterA.merge(counterB);
      expect(merged.value).toBe(5);
    });

    it('should merge LWW-Registers', () => {
        const registerA = new LWWRegister('A', 'foo', 100);
        const registerB = new LWWRegister('B', 'bar', 200);
        const merged = registerA.merge(registerB);
        expect(merged.value).toBe('bar');
      });

    it('should merge OR-Sets', () => {
      const setA = new ORSet('A');
      setA.add('apple');
      setA.add('banana');
      const setB = new ORSet('B');
      setB.add('banana');
      setB.add('cherry');
      setA.remove('apple');
      const merged = setA.merge(setB);
      expect(merged.value).toEqual(new Set(['banana', 'cherry']));
    });

    it('should handle concurrent adds and removes in OR-Sets', () => {
      const setA = new ORSet('A');
      setA.add('apple');
      const setB = new ORSet('B');
      setB.add('apple');
      setB.remove('apple');
      const merged = setA.merge(setB);
      expect(merged.value).toEqual(new Set(['apple']));
    });
  });

  describe('DistributedTransaction', () => {
    it('should successfully commit a 2PC transaction', () => {
      const coordinator = new TwoPhaseCommitCoordinator();
      const participant1: TransactionParticipant = {
        canCommit: () => true,
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      const participant2: TransactionParticipant = {
        canCommit: () => true,
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      coordinator.addParticipant(participant1);
      coordinator.addParticipant(participant2);

      const result = coordinator.execute();

      expect(result).toBe(true);
      expect(participant1.commit).toHaveBeenCalled();
      expect(participant2.commit).toHaveBeenCalled();
    });

    it('should rollback a 2PC transaction if a participant fails', () => {
        const coordinator = new TwoPhaseCommitCoordinator();
        const participant1: TransactionParticipant = {
          canCommit: () => true,
          commit: jest.fn(),
          rollback: jest.fn(),
        };
        const participant2: TransactionParticipant = {
          canCommit: () => false,
          commit: jest.fn(),
          rollback: jest.fn(),
        };
        coordinator.addParticipant(participant1);
        coordinator.addParticipant(participant2);

        const result = coordinator.execute();

        expect(result).toBe(false);
        expect(participant1.rollback).toHaveBeenCalled();
        expect(participant2.rollback).toHaveBeenCalled();
      });

    it('should successfully execute a saga', async () => {
      const coordinator = new SagaCoordinator();
      const action1: SagaAction = {
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined),
      };
      const action2: SagaAction = {
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined),
      };
      coordinator.addAction(action1);
      coordinator.addAction(action2);

      const result = await coordinator.execute();

      expect(result).toBe(true);
      expect(action1.execute).toHaveBeenCalled();
      expect(action2.execute).toHaveBeenCalled();
    });

    it('should compensate a saga if an action fails', async () => {
        const coordinator = new SagaCoordinator();
        const action1: SagaAction = {
          execute: jest.fn().mockResolvedValue(undefined),
          compensate: jest.fn().mockResolvedValue(undefined),
        };
        const action2: SagaAction = {
          execute: jest.fn().mockRejectedValue(new Error('Action failed')),
          compensate: jest.fn().mockResolvedValue(undefined),
        };
        coordinator.addAction(action1);
        coordinator.addAction(action2);

        const result = await coordinator.execute();

        expect(result).toBe(false);
        expect(action1.compensate).toHaveBeenCalled();
      });
  });

  describe('StateSyncClient', () => {
    let client: StateSyncClient;
    const mockWebSocket = {
      send: jest.fn(),
      on: jest.fn(),
    };

    beforeEach(() => {
      (WebSocket as jest.Mock).mockImplementation(() => mockWebSocket);
      client = new StateSyncClient('ws://localhost:8080');
    });

    it('should perform optimistic updates', () => {
      client.performOperation({ type: 'update', key: 'foo', value: 'bar' });
      const state = client.getState();
      expect(state.get('foo')).toBe('bar');
    });

    it('should queue operations when offline', () => {
        client.performOperation({ type: 'update', key: 'foo', value: 'bar' });
        expect(mockWebSocket.send).not.toHaveBeenCalled();
      });
  });
});
