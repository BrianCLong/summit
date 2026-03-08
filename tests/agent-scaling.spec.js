"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const evaluation_runner_1 = require("../src/agent-scaling/evaluation-runner");
const topology_generator_1 = require("../src/agent-scaling/topology-generator");
const metrics_1 = require("../src/agent-scaling/metrics");
describe('Agent Scaling', () => {
    it('should run single agent task', async () => {
        const runner = new evaluation_runner_1.EvaluationRunner({ maxSteps: 5, maxTokens: 1000, topology: 'single' });
        const metrics = await runner.runTask('test');
        expect(metrics.successRate).toBe(1.0);
        expect(metrics.coordinationOverhead).toBe(0);
    });
    it('should run multi agent task with overhead', async () => {
        const runner = new evaluation_runner_1.EvaluationRunner({ maxSteps: 10, maxTokens: 2000, topology: 'multi' });
        const metrics = await runner.runTask('test');
        expect(metrics.successRate).toBe(1.0);
        expect(metrics.coordinationOverhead).toBe(50);
    });
    it('should calculate coordination efficiency', () => {
        expect((0, metrics_1.coordinationEfficiency)(80, 85)).toBe(5);
    });
    it('should generate topologies', () => {
        const generator = new topology_generator_1.TopologyGenerator();
        expect(generator.generate('single').nodes).toContain('planner-executor');
        expect(generator.generate('multi').nodes).toContain('critic');
    });
});
