"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const real_time_aggregator_js_1 = require("../src/results/real-time-aggregator.js");
(0, vitest_1.describe)('RealTimeAggregator', () => {
    let aggregator;
    let testElection;
    (0, vitest_1.beforeEach)(() => {
        aggregator = new real_time_aggregator_js_1.RealTimeAggregator();
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
    (0, vitest_1.describe)('registerElection', () => {
        (0, vitest_1.it)('should register election with precincts', () => {
            aggregator.registerElection(testElection, ['precinct-1', 'precinct-2']);
            const results = aggregator.getResults('test-election-1');
            (0, vitest_1.expect)(results).not.toBeNull();
            (0, vitest_1.expect)(results.name).toBe('Test Election 2024');
            (0, vitest_1.expect)(results.precinctsTotal).toBe(2);
        });
    });
    (0, vitest_1.describe)('recordVote', () => {
        (0, vitest_1.it)('should tally votes correctly', () => {
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
            const mayorRace = results.items.find((i) => i.itemId === 'mayor-race');
            (0, vitest_1.expect)(mayorRace.totalVotes).toBe(3);
            (0, vitest_1.expect)(mayorRace.options[0].votes).toBe(2); // candidate-a
            (0, vitest_1.expect)(mayorRace.options[1].votes).toBe(1); // candidate-b
        });
    });
    (0, vitest_1.describe)('reportPrecinct', () => {
        (0, vitest_1.it)('should update reporting progress', () => {
            aggregator.registerElection(testElection, ['precinct-1', 'precinct-2']);
            const precinctResults = new Map([
                ['mayor-race', new Map([['candidate-a', 100], ['candidate-b', 50]])],
            ]);
            aggregator.reportPrecinct('test-election-1', 'precinct-1', precinctResults);
            const results = aggregator.getResults('test-election-1');
            (0, vitest_1.expect)(results.precinctsCounted).toBe(1);
            (0, vitest_1.expect)(results.reportingProgress).toBe(50);
        });
    });
    (0, vitest_1.describe)('certifyResults', () => {
        (0, vitest_1.it)('should certify when all precincts reported', () => {
            aggregator.registerElection(testElection, ['precinct-1']);
            const precinctResults = new Map([
                ['mayor-race', new Map([['candidate-a', 100]])],
            ]);
            aggregator.reportPrecinct('test-election-1', 'precinct-1', precinctResults);
            const certified = aggregator.certifyResults('test-election-1');
            (0, vitest_1.expect)(certified.certified).toBe(true);
            (0, vitest_1.expect)(certified.hash).toBeDefined();
        });
        (0, vitest_1.it)('should reject certification when precincts missing', () => {
            aggregator.registerElection(testElection, ['precinct-1', 'precinct-2']);
            (0, vitest_1.expect)(() => aggregator.certifyResults('test-election-1')).toThrow('Cannot certify: not all precincts reported');
        });
    });
    (0, vitest_1.describe)('subscribe', () => {
        (0, vitest_1.it)('should emit updates on vote recording', () => {
            aggregator.registerElection(testElection, ['precinct-1']);
            const updates = [];
            const unsubscribe = aggregator.subscribe('test-election-1', (update) => {
                updates.push(update);
            });
            aggregator.recordVote('test-election-1', [
                { itemId: 'mayor-race', selectedOptions: ['candidate-a'] },
            ]);
            (0, vitest_1.expect)(updates).toHaveLength(1);
            (0, vitest_1.expect)(updates[0]).toHaveProperty('type', 'vote_recorded');
            unsubscribe();
        });
    });
});
(0, vitest_1.describe)('RankedChoiceTabulator', () => {
    let tabulator;
    (0, vitest_1.beforeEach)(() => {
        tabulator = new real_time_aggregator_js_1.RankedChoiceTabulator();
    });
    (0, vitest_1.it)('should declare winner with majority in first round', () => {
        const ballots = [
            { rankings: ['A', 'B', 'C'] },
            { rankings: ['A', 'C', 'B'] },
            { rankings: ['A', 'B', 'C'] },
            { rankings: ['B', 'A', 'C'] },
        ];
        const result = tabulator.tabulate(ballots, ['A', 'B', 'C']);
        (0, vitest_1.expect)(result.winner).toBe('A');
        (0, vitest_1.expect)(result.rounds).toHaveLength(1);
    });
    (0, vitest_1.it)('should perform instant runoff when no majority', () => {
        const ballots = [
            { rankings: ['A', 'B', 'C'] },
            { rankings: ['A', 'B', 'C'] },
            { rankings: ['B', 'A', 'C'] },
            { rankings: ['B', 'A', 'C'] },
            { rankings: ['C', 'B', 'A'] },
        ];
        const result = tabulator.tabulate(ballots, ['A', 'B', 'C']);
        // C gets eliminated, votes go to B
        (0, vitest_1.expect)(result.winner).toBe('B');
        (0, vitest_1.expect)(result.rounds.length).toBeGreaterThan(1);
    });
    (0, vitest_1.it)('should handle two-candidate race', () => {
        const ballots = [
            { rankings: ['A', 'B'] },
            { rankings: ['B', 'A'] },
            { rankings: ['A', 'B'] },
        ];
        const result = tabulator.tabulate(ballots, ['A', 'B']);
        (0, vitest_1.expect)(result.winner).toBe('A');
    });
});
