import {
  AppliedState,
  AuditEntry,
  ConfigVersion,
  EnvironmentName,
  RepositoryWriter,
} from './types';

interface ConfigHistory<TConfig> {
  versions: ConfigVersion<TConfig>[];
  audit: AuditEntry[];
  applied: Map<EnvironmentName, AppliedState>;
}

export class InMemoryConfigRepository<TConfig = Record<string, any>>
  implements RepositoryWriter<TConfig>
{
  private histories = new Map<string, ConfigHistory<TConfig>>();

  constructor(private readonly clock: () => Date = () => new Date()) {}

  private ensureHistory(configId: string): ConfigHistory<TConfig> {
    const history = this.histories.get(configId);
    if (history) {
      return history;
    }
    const created: ConfigHistory<TConfig> = {
      versions: [],
      audit: [],
      applied: new Map(),
    };
    this.histories.set(configId, created);
    return created;
  }

  async saveVersion(
    configId: string,
    version: ConfigVersion<TConfig>,
    auditEntry: AuditEntry,
  ): Promise<void> {
    const history = this.ensureHistory(configId);
    history.versions.push(version);
    history.audit.push(auditEntry);
  }

  async getLatestVersion(
    configId: string,
  ): Promise<ConfigVersion<TConfig> | undefined> {
    const history = this.histories.get(configId);
    if (!history || history.versions.length === 0) {
      return undefined;
    }
    return history.versions[history.versions.length - 1];
  }

  async getVersion(
    configId: string,
    versionNumber: number,
  ): Promise<ConfigVersion<TConfig> | undefined> {
    const history = this.histories.get(configId);
    return history?.versions.find(
      (entry) => entry.metadata.version === versionNumber,
    );
  }

  async listVersions(configId: string): Promise<ConfigVersion<TConfig>[]> {
    const history = this.histories.get(configId);
    return history ? [...history.versions] : [];
  }

  async recordAppliedState(
    configId: string,
    state: AppliedState,
  ): Promise<void> {
    const history = this.ensureHistory(configId);
    history.applied.set(state.environment, {
      ...state,
      appliedAt: state.appliedAt ?? this.clock(),
    });
  }

  async getAppliedState(
    configId: string,
    environment: EnvironmentName,
  ): Promise<AppliedState | undefined> {
    const history = this.histories.get(configId);
    return history?.applied.get(environment);
  }

  async getAuditTrail(configId: string): Promise<AuditEntry[]> {
    const history = this.histories.get(configId);
    return history ? [...history.audit] : [];
  }
}

export default InMemoryConfigRepository;
