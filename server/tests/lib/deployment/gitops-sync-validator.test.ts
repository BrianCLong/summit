
import { GitOpsSyncValidator, SyncConfig, ResourceState, GitProvider, ClusterProvider } from '../../../lib/deployment/gitops-sync-validator';

describe('GitOpsSyncValidator', () => {
  const config: SyncConfig = {
    repoUrl: 'https://github.com/org/repo',
    branch: 'main',
    manifestPath: 'k8s/',
    clusterNamespace: 'default',
    labelSelector: 'app=myapp'
  };

  class MockGitProvider implements GitProvider {
    constructor(private resources: ResourceState[]) {}
    async fetchManifests(): Promise<ResourceState[]> {
      return this.resources;
    }
  }

  class MockClusterProvider implements ClusterProvider {
    constructor(private resources: ResourceState[]) {}
    async fetchResources(): Promise<ResourceState[]> {
      return this.resources;
    }
  }

  it('should report no drift when states are identical', async () => {
    const resources: ResourceState[] = [
      { kind: 'Deployment', name: 'app', namespace: 'default', version: 'v1', replicas: 2 }
    ];

    const validator = new GitOpsSyncValidator(
      config,
      new MockGitProvider(resources),
      new MockClusterProvider(resources)
    );

    const report = await validator.validate();

    expect(report.hasDrift).toBe(false);
    expect(report.drifts).toHaveLength(0);
  });

  it('should detect VERSION_MISMATCH', async () => {
    const gitState: ResourceState[] = [
      { kind: 'Deployment', name: 'app', namespace: 'default', version: 'v2', replicas: 2 }
    ];
    const clusterState: ResourceState[] = [
      { kind: 'Deployment', name: 'app', namespace: 'default', version: 'v1', replicas: 2 }
    ];

    const validator = new GitOpsSyncValidator(
      config,
      new MockGitProvider(gitState),
      new MockClusterProvider(clusterState)
    );

    const report = await validator.validate();

    expect(report.hasDrift).toBe(true);
    expect(report.drifts).toContainEqual({
      resourceId: 'Deployment/app',
      driftType: 'VERSION_MISMATCH',
      expected: 'v2',
      actual: 'v1'
    });
  });

  it('should detect REPLICA_MISMATCH', async () => {
    const gitState: ResourceState[] = [
      { kind: 'Deployment', name: 'app', namespace: 'default', version: 'v1', replicas: 3 }
    ];
    const clusterState: ResourceState[] = [
      { kind: 'Deployment', name: 'app', namespace: 'default', version: 'v1', replicas: 1 }
    ];

    const validator = new GitOpsSyncValidator(
      config,
      new MockGitProvider(gitState),
      new MockClusterProvider(clusterState)
    );

    const report = await validator.validate();

    expect(report.hasDrift).toBe(true);
    expect(report.drifts).toContainEqual({
      resourceId: 'Deployment/app',
      driftType: 'REPLICA_MISMATCH',
      expected: 3,
      actual: 1
    });
  });

  it('should detect MISSING_IN_CLUSTER', async () => {
    const gitState: ResourceState[] = [
      { kind: 'Deployment', name: 'app', namespace: 'default', version: 'v1', replicas: 1 }
    ];
    const clusterState: ResourceState[] = [];

    const validator = new GitOpsSyncValidator(
      config,
      new MockGitProvider(gitState),
      new MockClusterProvider(clusterState)
    );

    const report = await validator.validate();

    expect(report.hasDrift).toBe(true);
    expect(report.drifts).toContainEqual({
      resourceId: 'Deployment/app',
      driftType: 'MISSING_IN_CLUSTER',
      expected: 'Present',
      actual: 'Missing'
    });
  });

  it('should detect MISSING_IN_GIT', async () => {
    const gitState: ResourceState[] = [];
    const clusterState: ResourceState[] = [
      { kind: 'Service', name: 'extra', namespace: 'default', version: 'v1', replicas: 1 }
    ];

    const validator = new GitOpsSyncValidator(
      config,
      new MockGitProvider(gitState),
      new MockClusterProvider(clusterState)
    );

    const report = await validator.validate();

    expect(report.hasDrift).toBe(true);
    expect(report.drifts).toContainEqual({
      resourceId: 'Service/extra',
      driftType: 'MISSING_IN_GIT',
      expected: 'Absent',
      actual: 'Present'
    });
  });
});
