"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const intensity_1 = require("../../summit/agents/governance/intensity");
const agent_orchestrator_1 = require("../../summit/agents/orchestrator/agent-orchestrator");
const invocation = {
    env: 'dev',
    agent_role: 'builder',
};
(0, node_test_1.default)('intensity==0 blocks repo.write, net, fs', () => {
    strict_1.default.equal((0, intensity_1.enforceIntensity)(invocation, 0, {
        name: 'dangerous.skill',
        risk: 'low',
        scopes: ['repo.write'],
    }).allow, false);
    strict_1.default.equal((0, intensity_1.enforceIntensity)(invocation, 0, {
        name: 'dangerous.skill',
        risk: 'low',
        scopes: ['net'],
    }).allow, false);
    strict_1.default.equal((0, intensity_1.enforceIntensity)(invocation, 0, {
        name: 'dangerous.skill',
        risk: 'low',
        scopes: ['fs'],
    }).allow, false);
});
(0, node_test_1.default)('intensity==1 blocks medium/high risk writes even if policy would allow', () => {
    const decision = (0, intensity_1.enforceIntensity)({
        ...invocation,
        allowed_repo_paths: ['docs/'],
    }, 1, {
        name: 'release.approve',
        risk: 'high',
        scopes: ['repo.write'],
        repo_paths: ['docs/'],
    });
    strict_1.default.equal(decision.allow, false);
    strict_1.default.match(decision.reason, /medium\/high risk/);
});
(0, node_test_1.default)('intensity events are emitted deterministically', () => {
    const eventsA = [];
    const eventsB = [];
    const request = {
        env: 'prod',
        agent_role: 'builder',
        run_id: 'run-7',
        task_id: 'task-9',
        agent_name: 'codex',
        skill: 'docs.update',
    };
    const skillSpec = {
        name: 'docs.update',
        risk: 'low',
        scopes: ['repo.write'],
        repo_paths: ['docs/'],
    };
    (0, agent_orchestrator_1.evaluateIntensityDecision)(request, 0, skillSpec, {
        emit: (event) => eventsA.push(event),
    });
    (0, agent_orchestrator_1.evaluateIntensityDecision)(request, 0, skillSpec, {
        emit: (event) => eventsB.push(event),
    });
    strict_1.default.deepEqual(eventsA, eventsB);
    strict_1.default.equal(eventsA[0].type, 'INTENSITY_EVALUATED');
    strict_1.default.equal(eventsA[1].type, 'INTENSITY_DENIED');
});
(0, node_test_1.default)('parseIntensity defaults by env and accepts explicit values', () => {
    strict_1.default.equal((0, intensity_1.parseIntensity)('prod', undefined), 0);
    strict_1.default.equal((0, intensity_1.parseIntensity)('dev', undefined), 1);
    strict_1.default.equal((0, intensity_1.parseIntensity)('test', undefined), 1);
    strict_1.default.equal((0, intensity_1.parseIntensity)('dev', '2'), 2);
});
