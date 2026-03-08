"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const gitops_sync_validator_1 = require("../../../lib/deployment/gitops-sync-validator");
(0, globals_1.describe)('GitOpsSyncValidator', () => {
    const config = {
        repoUrl: 'https://github.com/org/repo',
        branch: 'main',
        manifestPath: 'k8s/',
        clusterNamespace: 'default',
        labelSelector: 'app=myapp'
    };
    class MockGitProvider {
        resources;
        constructor(resources) {
            this.resources = resources;
        }
        async fetchManifests() {
            return this.resources;
        }
    }
    class MockClusterProvider {
        resources;
        constructor(resources) {
            this.resources = resources;
        }
        async fetchResources() {
            return this.resources;
        }
    }
    (0, globals_1.it)('should report no drift when states are identical', async () => {
        const resources = [
            { kind: 'Deployment', name: 'app', namespace: 'default', version: 'v1', replicas: 2 }
        ];
        const validator = new gitops_sync_validator_1.GitOpsSyncValidator(config, new MockGitProvider(resources), new MockClusterProvider(resources));
        const report = await validator.validate();
        (0, globals_1.expect)(report.hasDrift).toBe(false);
        (0, globals_1.expect)(report.drifts).toHaveLength(0);
    });
    (0, globals_1.it)('should detect VERSION_MISMATCH', async () => {
        const gitState = [
            { kind: 'Deployment', name: 'app', namespace: 'default', version: 'v2', replicas: 2 }
        ];
        const clusterState = [
            { kind: 'Deployment', name: 'app', namespace: 'default', version: 'v1', replicas: 2 }
        ];
        const validator = new gitops_sync_validator_1.GitOpsSyncValidator(config, new MockGitProvider(gitState), new MockClusterProvider(clusterState));
        const report = await validator.validate();
        (0, globals_1.expect)(report.hasDrift).toBe(true);
        (0, globals_1.expect)(report.drifts).toContainEqual({
            resourceId: 'Deployment/app',
            driftType: 'VERSION_MISMATCH',
            expected: 'v2',
            actual: 'v1'
        });
    });
    (0, globals_1.it)('should detect REPLICA_MISMATCH', async () => {
        const gitState = [
            { kind: 'Deployment', name: 'app', namespace: 'default', version: 'v1', replicas: 3 }
        ];
        const clusterState = [
            { kind: 'Deployment', name: 'app', namespace: 'default', version: 'v1', replicas: 1 }
        ];
        const validator = new gitops_sync_validator_1.GitOpsSyncValidator(config, new MockGitProvider(gitState), new MockClusterProvider(clusterState));
        const report = await validator.validate();
        (0, globals_1.expect)(report.hasDrift).toBe(true);
        (0, globals_1.expect)(report.drifts).toContainEqual({
            resourceId: 'Deployment/app',
            driftType: 'REPLICA_MISMATCH',
            expected: 3,
            actual: 1
        });
    });
    (0, globals_1.it)('should detect MISSING_IN_CLUSTER', async () => {
        const gitState = [
            { kind: 'Deployment', name: 'app', namespace: 'default', version: 'v1', replicas: 1 }
        ];
        const clusterState = [];
        const validator = new gitops_sync_validator_1.GitOpsSyncValidator(config, new MockGitProvider(gitState), new MockClusterProvider(clusterState));
        const report = await validator.validate();
        (0, globals_1.expect)(report.hasDrift).toBe(true);
        (0, globals_1.expect)(report.drifts).toContainEqual({
            resourceId: 'Deployment/app',
            driftType: 'MISSING_IN_CLUSTER',
            expected: 'Present',
            actual: 'Missing'
        });
    });
    (0, globals_1.it)('should detect MISSING_IN_GIT', async () => {
        const gitState = [];
        const clusterState = [
            { kind: 'Service', name: 'extra', namespace: 'default', version: 'v1', replicas: 1 }
        ];
        const validator = new gitops_sync_validator_1.GitOpsSyncValidator(config, new MockGitProvider(gitState), new MockClusterProvider(clusterState));
        const report = await validator.validate();
        (0, globals_1.expect)(report.hasDrift).toBe(true);
        (0, globals_1.expect)(report.drifts).toContainEqual({
            resourceId: 'Service/extra',
            driftType: 'MISSING_IN_GIT',
            expected: 'Absent',
            actual: 'Present'
        });
    });
});
