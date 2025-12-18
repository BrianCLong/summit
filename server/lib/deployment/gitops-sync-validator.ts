
export interface ResourceState {
  kind: string;
  name: string;
  namespace: string;
  version: string; // e.g., image tag, config hash, or chart version
  replicas?: number;
}

export interface SyncConfig {
  repoUrl: string;
  branch: string;
  manifestPath: string;
  clusterNamespace: string;
  labelSelector: string;
}

export interface DriftItem {
  resourceId: string; // "kind/name"
  driftType: 'MISSING_IN_CLUSTER' | 'MISSING_IN_GIT' | 'VERSION_MISMATCH' | 'REPLICA_MISMATCH';
  expected?: string | number;
  actual?: string | number;
}

export interface DriftReport {
  hasDrift: boolean;
  drifts: DriftItem[];
  timestamp: Date;
}

export interface GitProvider {
  fetchManifests(repoUrl: string, branch: string, path: string): Promise<ResourceState[]>;
}

export interface ClusterProvider {
  fetchResources(namespace: string, labelSelector: string): Promise<ResourceState[]>;
}

export class GitOpsSyncValidator {
  private config: SyncConfig;
  private gitProvider: GitProvider;
  private clusterProvider: ClusterProvider;

  constructor(config: SyncConfig, gitProvider: GitProvider, clusterProvider: ClusterProvider) {
    this.config = config;
    this.gitProvider = gitProvider;
    this.clusterProvider = clusterProvider;
  }

  public async validate(): Promise<DriftReport> {
    console.log(`Starting GitOps sync validation for ${this.config.repoUrl} -> ${this.config.clusterNamespace}`);

    // Fetch states
    const gitState = await this.getGitState();
    const clusterState = await this.getClusterState();

    // Compare
    const report = this.compareStates(gitState, clusterState);

    this.logReport(report);

    return report;
  }

  private async getGitState(): Promise<ResourceState[]> {
    return this.gitProvider.fetchManifests(this.config.repoUrl, this.config.branch, this.config.manifestPath);
  }

  private async getClusterState(): Promise<ResourceState[]> {
    return this.clusterProvider.fetchResources(this.config.clusterNamespace, this.config.labelSelector);
  }

  private compareStates(gitResources: ResourceState[], clusterResources: ResourceState[]): DriftReport {
    const drifts: DriftItem[] = [];

    const gitMap = new Map<string, ResourceState>();
    gitResources.forEach(r => gitMap.set(this.getResourceId(r), r));

    const clusterMap = new Map<string, ResourceState>();
    clusterResources.forEach(r => clusterMap.set(this.getResourceId(r), r));

    // Check for resources in Git that are missing or different in Cluster
    for (const [id, gitRes] of gitMap) {
      const clusterRes = clusterMap.get(id);

      if (!clusterRes) {
        drifts.push({
          resourceId: id,
          driftType: 'MISSING_IN_CLUSTER',
          expected: 'Present',
          actual: 'Missing'
        });
      } else {
        // Compare version
        if (gitRes.version !== clusterRes.version) {
          drifts.push({
            resourceId: id,
            driftType: 'VERSION_MISMATCH',
            expected: gitRes.version,
            actual: clusterRes.version
          });
        }
        // Compare replicas if applicable
        if (gitRes.replicas !== undefined && clusterRes.replicas !== undefined && gitRes.replicas !== clusterRes.replicas) {
          drifts.push({
            resourceId: id,
            driftType: 'REPLICA_MISMATCH',
            expected: gitRes.replicas,
            actual: clusterRes.replicas
          });
        }
      }
    }

    // Check for resources in Cluster that are not in Git (orphan resources)
    for (const [id, _] of clusterMap) {
      if (!gitMap.has(id)) {
        drifts.push({
          resourceId: id,
          driftType: 'MISSING_IN_GIT',
          expected: 'Absent',
          actual: 'Present'
        });
      }
    }

    return {
      hasDrift: drifts.length > 0,
      drifts,
      timestamp: new Date()
    };
  }

  private getResourceId(resource: ResourceState): string {
    return `${resource.kind}/${resource.name}`;
  }

  private logReport(report: DriftReport): void {
    if (!report.hasDrift) {
      console.log('✅ No drift detected. Cluster is in sync with Git.');
    } else {
      console.warn('⚠️  Drift detected!');
      report.drifts.forEach(drift => {
        console.warn(` - [${drift.driftType}] ${drift.resourceId}: Expected ${drift.expected}, found ${drift.actual}`);
      });
    }
  }
}
