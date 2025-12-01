import { describe, it, expect, beforeEach } from 'vitest';
import { RealTimeAggregator, RankedChoiceTabulator } from '../src/results/real-time-aggregator.js';
import type { Election } from '../src/types/election.js';

describe('RealTimeAggregator', () => {
  let aggregator: RealTimeAggregator;
  let testElection: Election;

  beforeEach(() => {
    aggregator = new RealTimeAggregator();
    testElection = {
      electionId: 'test-election-1',
      name: 'Test Election 2024',
      type: 'general',
      jurisdiction: 'Test County',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 86400000).toISOString(),
      status: 'active',
      ballotItems: [
        {
          itemId: 'mayor-race',
          type: 'candidate',
          title: 'Mayor',
          description: 'Elect the mayor',
          options: [
            { optionId: 'candidate-a', label: 'Alice Smith' },
            { optionId: 'candidate-b', label: 'Bob Jones' },
          ],
          maxSelections: 1,
          minSelections: 0,
        },
      ],
    };
  });

  describe('registerElection', () => {
    it('should register election with precincts', () => {
      aggregator.registerElection(testElection, ['precinct-1', 'precinct-2']);

      const results = aggregator.getResults('test-election-1');

      expect(results).not.toBeNull();
      expect(results!.name).toBe('Test Election 2024');
      expect(results!.precinctsTotal).toBe(2);
    });
  });

  describe('recordVote', () => {
    it('should tally votes correctly', () => {
      aggregator.registerElection(testElection, ['precinct-1']);

      aggregator.recordVote('test-election-1', [
        { itemId: 'mayor-race', selectedOptions: ['candidate-a'] },
      ]);
      aggregator.recordVote('test-election-1', [
        { itemId: 'mayor-race', selectedOptions: ['candidate-a'] },
      ]);
      aggregator.recordVote('test-election-1', [
        { itemId: 'mayor-race', selectedOptions: ['candidate-b'] },
      ]);

      const results = aggregator.getResults('test-election-1');
      const mayorRace = results!.items.find((i) => i.itemId === 'mayor-race');

      expect(mayorRace!.totalVotes).toBe(3);
      expect(mayorRace!.options[0].votes).toBe(2); // candidate-a
      expect(mayorRace!.options[1].votes).toBe(1); // candidate-b
    });
  });

  describe('reportPrecinct', () => {
    it('should update reporting progress', () => {
      aggregator.registerElection(testElection, ['precinct-1', 'precinct-2']);

      const precinctResults = new Map([
        ['mayor-race', new Map([['candidate-a', 100], ['candidate-b', 50]])],
      ]);

      aggregator.reportPrecinct('test-election-1', 'precinct-1', precinctResults);

      const results = aggregator.getResults('test-election-1');

      expect(results!.precinctsCounted).toBe(1);
      expect(results!.reportingProgress).toBe(50);
    });
  });

  describe('certifyResults', () => {
    it('should certify when all precincts reported', () => {
      aggregator.registerElection(testElection, ['precinct-1']);

      const precinctResults = new Map([
        ['mayor-race', new Map([['candidate-a', 100]])],
      ]);

      aggregator.reportPrecinct('test-election-1', 'precinct-1', precinctResults);

      const certified = aggregator.certifyResults('test-election-1');

      expect(certified.certified).toBe(true);
      expect(certified.hash).toBeDefined();
    });

    it('should reject certification when precincts missing', () => {
      aggregator.registerElection(testElection, ['precinct-1', 'precinct-2']);

      expect(() => aggregator.certifyResults('test-election-1')).toThrow(
        'Cannot certify: not all precincts reported'
      );
    });
  });

  describe('subscribe', () => {
    it('should emit updates on vote recording', () => {
      aggregator.registerElection(testElection, ['precinct-1']);

      const updates: unknown[] = [];
      const unsubscribe = aggregator.subscribe('test-election-1', (update) => {
        updates.push(update);
      });

      aggregator.recordVote('test-election-1', [
        { itemId: 'mayor-race', selectedOptions: ['candidate-a'] },
      ]);

      expect(updates).toHaveLength(1);
      expect(updates[0]).toHaveProperty('type', 'vote_recorded');

      unsubscribe();
    });
  });
});

describe('RankedChoiceTabulator', () => {
  let tabulator: RankedChoiceTabulator;

  beforeEach(() => {
    tabulator = new RankedChoiceTabulator();
  });

  it('should declare winner with majority in first round', () => {
    const ballots = [
      { rankings: ['A', 'B', 'C'] },
      { rankings: ['A', 'C', 'B'] },
      { rankings: ['A', 'B', 'C'] },
      { rankings: ['B', 'A', 'C'] },
    ];

    const result = tabulator.tabulate(ballots, ['A', 'B', 'C']);

    expect(result.winner).toBe('A');
    expect(result.rounds).toHaveLength(1);
  });

  it('should perform instant runoff when no majority', () => {
    const ballots = [
      { rankings: ['A', 'B', 'C'] },
      { rankings: ['A', 'B', 'C'] },
      { rankings: ['B', 'A', 'C'] },
      { rankings: ['B', 'A', 'C'] },
      { rankings: ['C', 'B', 'A'] },
    ];

    const result = tabulator.tabulate(ballots, ['A', 'B', 'C']);

    // C gets eliminated, votes go to B
    expect(result.winner).toBe('B');
    expect(result.rounds.length).toBeGreaterThan(1);
  });

  it('should handle two-candidate race', () => {
    const ballots = [
      { rankings: ['A', 'B'] },
      { rankings: ['B', 'A'] },
      { rankings: ['A', 'B'] },
    ];

    const result = tabulator.tabulate(ballots, ['A', 'B']);

    expect(result.winner).toBe('A');
  });
});
