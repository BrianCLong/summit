import domainMap from '../../docs/domains/domain-map.json';
import { BoundaryViolation, DomainDefinition, ServiceAccessDescriptor } from './types.js';
import { ValidationError } from './errors.js';
import { boundaryViolationCounter } from './metrics.js';

interface DomainMapFile {
  domains: DomainDefinition[];
}

const fileContents = domainMap as unknown as DomainMapFile;

export class DomainRegistry {
  private readonly domains: Map<string, DomainDefinition>;

  constructor(definitions: DomainDefinition[] = fileContents.domains) {
    if (!definitions?.length) {
      throw new ValidationError('Domain map must include at least one domain');
    }
    this.domains = new Map();
    definitions.forEach((definition) => {
      if (this.domains.has(definition.name)) {
        throw new ValidationError(`Duplicate domain detected: ${definition.name}`);
      }
      DomainRegistry.validateDefinition(definition);
      this.domains.set(definition.name, definition);
    });
  }

  static validateDefinition(definition: DomainDefinition): void {
    if (!definition.writePath) {
      throw new ValidationError(`Domain ${definition.name} is missing a write path`);
    }
    if (definition.commands.length === 0) {
      throw new ValidationError(`Domain ${definition.name} must expose at least one command`);
    }
    if (definition.events.length === 0) {
      throw new ValidationError(`Domain ${definition.name} must emit at least one event`);
    }
    if (definition.readModels.length === 0) {
      throw new ValidationError(`Domain ${definition.name} must maintain at least one read model`);
    }
  }

  getDomains(): DomainDefinition[] {
    return Array.from(this.domains.values());
  }

  getDomain(name: string): DomainDefinition {
    const domain = this.domains.get(name);
    if (!domain) {
      throw new ValidationError(`Unknown domain ${name}`);
    }
    return domain;
  }

  evaluateAccess(descriptor: ServiceAccessDescriptor): BoundaryViolation[] {
    const violations: BoundaryViolation[] = [];
    const sourceDomain = this.getDomain(descriptor.domain);

    if (!descriptor.errorModelImplemented) {
      violations.push({
        type: 'MISSING_ERROR_MODEL',
        sourceService: descriptor.service,
        sourceDomain: sourceDomain.name,
        targetDomain: sourceDomain.name,
        resource: 'error-model',
        severity: 'high',
        timestamp: new Date(),
        details: 'Standard error envelope not implemented',
      });
    }

    descriptor.writes.forEach((write) => {
      if (write.domain !== sourceDomain.name && !write.viaAdapter) {
        violations.push({
          type: 'CROSS_DOMAIN_DB_ACCESS',
          sourceService: descriptor.service,
          sourceDomain: sourceDomain.name,
          targetDomain: write.domain,
          resource: write.resource,
          severity: 'critical',
          timestamp: new Date(),
          details: 'Direct write without adapter',
        });
      }
      const targetDefinition = this.domains.get(write.domain);
      if (targetDefinition && write.domain === sourceDomain.name) {
        const expectedAdapter = targetDefinition.writePath.adapter;
        if (write.viaAdapter && write.resource !== expectedAdapter) {
          violations.push({
            type: 'MULTIPLE_WRITE_PATHS',
            sourceService: descriptor.service,
            sourceDomain: sourceDomain.name,
            targetDomain: write.domain,
            resource: write.resource,
            severity: 'high',
            timestamp: new Date(),
            details: 'Write path deviates from authoritative adapter',
          });
        }
      }
    });

    descriptor.reads.forEach((read) => {
      if (read.domain !== sourceDomain.name && !read.viaAdapter) {
        violations.push({
          type: 'STRANGLER_BYPASS',
          sourceService: descriptor.service,
          sourceDomain: sourceDomain.name,
          targetDomain: read.domain,
          resource: read.resource,
          severity: 'medium',
          timestamp: new Date(),
          details: 'Read bypasses adapter/edge layer',
        });
      }
    });

    violations.forEach((violation) => {
      boundaryViolationCounter.labels({
        source_domain: violation.sourceDomain,
        target_domain: violation.targetDomain,
        type: violation.type,
      }).inc();
    });

    return violations;
  }
}
