import { AdminRepairService } from './adminTools';
import { EventContractRegistry } from './eventContracts';
import { GovernanceTracker } from './governance';
import { InvariantRegistry, buildBooleanStateMachine } from './invariants';
import { MigrationFactory, buildManifest } from './migrationFactory';
import { RecordTimeline } from './observability';
import { ReconciliationEngine } from './reconciliation';
import { TruthMapRegistry, defaultTruthSources } from './domain';
import {
  CanonicalIdentityPolicy,
  DomainName,
  DriftPair,
  EventSchema,
  MigrationManifest,
  TruthMapEntry,
} from './types';

export class CorrectnessProgram {
  readonly truthMap = new TruthMapRegistry();
  readonly invariants = new InvariantRegistry();
  readonly reconciliation = new ReconciliationEngine();
  readonly migrations = new MigrationFactory();
  readonly eventContracts = new EventContractRegistry();
  readonly timeline = new RecordTimeline();
  readonly adminRepairs = new AdminRepairService();
  readonly governance = new GovernanceTracker();

  bootstrapDefaultDomains() {
    const defaults: { domain: DomainName; policy: CanonicalIdentityPolicy; writers: string[]; readers: string[] }[] = [
      {
        domain: 'customer',
        policy: {
          canonicalIdField: 'customerId',
          mergePolicy: 'prefer_newest',
          splitPolicy: 'manual_review',
          resolutionRules: ['email normalized', 'oidc subject wins when present'],
        },
        writers: ['customer-api'],
        readers: ['customer-api', 'reporting'],
      },
      {
        domain: 'billing',
        policy: {
          canonicalIdField: 'invoiceId',
          mergePolicy: 'manual_review',
          splitPolicy: 'manual_review',
          resolutionRules: ['ledger entry id is canonical', 'entitlement must exist'],
        },
        writers: ['billing-writer'],
        readers: ['billing-reader', 'reporting'],
      },
      {
        domain: 'permissions',
        policy: {
          canonicalIdField: 'subjectId',
          mergePolicy: 'prefer_newest',
          splitPolicy: 'manual_review',
          resolutionRules: ['subject must match identity provider', 'role dedupe per tenant'],
        },
        writers: ['rbac-service'],
        readers: ['rbac-service', 'edge'],
      },
    ];

    defaults.forEach(({ domain, policy, writers, readers }) => {
      const entry: TruthMapEntry = {
        domain,
        systemOfRecord: defaultTruthSources[domain],
        writers: writers.map((name) => ({ name, kind: 'service' } as const)),
        readers: readers.map((name) => ({ name, kind: 'service' } as const)),
        caches: [
          {
            name: `${domain}-cache`,
            kind: 'cache',
            guards: ['ttl'],
          },
        ],
        syncPaths: [
          { from: defaultTruthSources[domain].name, to: `${domain}-cache`, cadence: '5m', guardedBy: ['checksum'] },
        ],
      };
      this.truthMap.declareDomain(entry, policy);
    });

    this.invariants.registerStateMachine(buildBooleanStateMachine('customer-active', 'customer', 'active', 'inactive'));
  }

  declareDriftPair(pair: DriftPair) {
    this.reconciliation.registerPair(pair);
  }

  registerEventSchema(schema: EventSchema) {
    this.eventContracts.registerSchema(schema);
  }

  startMigration(manifest: MigrationManifest, total?: number) {
    return this.migrations.start(manifest, total);
  }

  buildMigrationManifest(domain: DomainName, scope: string) {
    return buildManifest(domain, scope);
  }
}

export const correctnessProgram = new CorrectnessProgram();
correctnessProgram.bootstrapDefaultDomains();

// Export the enhanced agent coordination service
// export { AgentCoordinationService, agentCoordinationService } from './agent-coordination.js';
