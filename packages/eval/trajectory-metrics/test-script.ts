import { TrajectoryEvaluator, Trajectory } from './src/index';

const evaluator = new TrajectoryEvaluator();

const goodTrajectory: Trajectory = {
    runId: 'run-1',
    steps: [
        { id: '1', type: 'plan', status: 'succeeded', timestamp: 1000 },
        { id: '2', type: 'act', status: 'succeeded', timestamp: 2000 },
    ],
    finalStatus: 'succeeded',
    startTime: 1000,
    endTime: 3000
};

const badTrajectory: Trajectory = {
    runId: 'run-2',
    steps: [
        { id: '1', type: 'act', status: 'failed', timestamp: 1000 },
        { id: '2', type: 'act', status: 'failed', timestamp: 2000 }, // Oscillation
        { id: '3', type: 'act', status: 'failed', timestamp: 3000 }, // Oscillation
    ],
    finalStatus: 'failed',
    startTime: 1000,
    endTime: 4000
};

const goodScore = evaluator.evaluate(goodTrajectory);
console.log('Good Score:', goodScore);

const badScore = evaluator.evaluate(badTrajectory);
console.log('Bad Score:', badScore);

if (goodScore.overallHealthScore <= badScore.overallHealthScore) {
    throw new Error('Scoring logic flawed: Good run should score higher');
}
console.log('Verification passed');
