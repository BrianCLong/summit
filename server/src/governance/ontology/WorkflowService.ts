
import { ChangeRequest, SchemaVersion, SchemaDefinition, Vocabulary, Concept } from './models';
import { SchemaRegistryService } from './SchemaRegistryService';
import { randomUUID } from 'crypto';
import { FilePersistenceAdapter, PersistenceAdapter } from './persistence';

export class WorkflowService {
  private static instance: WorkflowService;
  private changeRequests: Map<string, ChangeRequest> = new Map();
  private registry: SchemaRegistryService;
  private crRepo: PersistenceAdapter<ChangeRequest>;

  private constructor() {
    this.registry = SchemaRegistryService.getInstance();
    this.crRepo = new FilePersistenceAdapter<ChangeRequest>('change_requests');
    this.loadFromPersistence();
  }

  public static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }

  private async loadFromPersistence() {
      const crs = await this.crRepo.list();
      crs.forEach(cr => {
          cr.createdAt = new Date(cr.createdAt);
          cr.updatedAt = new Date(cr.updatedAt);
          cr.comments.forEach(c => c.timestamp = new Date(c.timestamp));
          this.changeRequests.set(cr.id, cr);
      });
  }

  public async createChangeRequest(
    title: string,
    description: string,
    author: string,
    proposedChanges: ChangeRequest['proposedChanges']
  ): Promise<ChangeRequest> {
    const cr: ChangeRequest = {
      id: randomUUID(),
      title,
      description,
      author,
      status: 'OPEN',
      proposedChanges,
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.changeRequests.set(cr.id, cr);
    await this.crRepo.save(cr.id, cr);
    return cr;
  }

  public getChangeRequest(id: string): ChangeRequest | undefined {
    return this.changeRequests.get(id);
  }

  public listChangeRequests(): ChangeRequest[] {
    return Array.from(this.changeRequests.values()).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  public async addComment(crId: string, author: string, message: string): Promise<ChangeRequest> {
    const cr = this.changeRequests.get(crId);
    if (!cr) throw new Error('Change Request not found');

    cr.comments.push({ author, message, timestamp: new Date() });
    cr.updatedAt = new Date();
    await this.crRepo.save(cr.id, cr);
    return cr;
  }

  public async reviewChangeRequest(id: string, reviewer: string, decision: 'APPROVED' | 'REJECTED', comment?: string): Promise<ChangeRequest> {
    const cr = this.changeRequests.get(id);
    if (!cr) throw new Error('Change Request not found');

    if (comment) {
        await this.addComment(id, reviewer, `[${decision}] ${comment}`);
    }

    if (decision === 'APPROVED') {
        cr.status = 'APPROVED';
    } else {
        cr.status = 'REJECTED';
    }
    cr.updatedAt = new Date();
    await this.crRepo.save(cr.id, cr);
    return cr;
  }

  public async mergeChangeRequest(id: string, merger: string): Promise<SchemaVersion> {
    const cr = this.changeRequests.get(id);
    if (!cr) throw new Error('Change Request not found');
    if (cr.status !== 'APPROVED') throw new Error('Change Request must be APPROVED to merge');

    // 1. Get current active schema
    const currentSchema = this.registry.getLatestSchema();
    if (!currentSchema) throw new Error('No active schema to base changes on');

    // 2. Clone definition
    const newDefinition = JSON.parse(JSON.stringify(currentSchema.definition)) as SchemaDefinition;

    // 3. Apply changes
    for (const change of cr.proposedChanges) {
        await this.applyChange(newDefinition, change);
    }

    // 4. Register new schema
    const newVersion = await this.registry.registerSchema(newDefinition, `Merged CR: ${cr.title}`, merger);

    // 5. Activate new schema
    await this.registry.activateSchema(newVersion.id, merger);

    // 6. Update CR status
    cr.status = 'MERGED';
    cr.updatedAt = new Date();
    await this.crRepo.save(cr.id, cr);

    return newVersion;
  }

  private async applyChange(definition: SchemaDefinition, change: ChangeRequest['proposedChanges'][0]) {
      switch (change.type) {
          case 'ADD_ENTITY':
              // Check for duplicate name
              if (definition.entities.find(e => e.name === change.payload.name)) {
                  throw new Error(`Entity ${change.payload.name} already exists`);
              }
              definition.entities.push(change.payload);
              break;

          case 'MODIFY_ENTITY':
              const entityIdx = definition.entities.findIndex(e => e.name === change.targetId);
              if (entityIdx !== -1) {
                  definition.entities[entityIdx] = { ...definition.entities[entityIdx], ...change.payload };
              } else {
                  throw new Error(`Entity ${change.targetId} not found`);
              }
              break;

          case 'DEPRECATE_ENTITY':
              // In this simplified model, we might just rename or tag it.
              // Real deprecation might involve 'deprecated' flag on EntityDefinition.
              // For now, let's assume payload contains { deprecated: true } and use MODIFY logic
              // or strict removal if that's the intent (though schemas usually grow only).
              // Let's assume DEPRECATE adds a constraint "DEPRECATED".
               const depEntity = definition.entities.find(e => e.name === change.targetId);
               if (depEntity) {
                   depEntity.constraints.push('DEPRECATED');
               }
              break;

          case 'ADD_FIELD':
              // targetId is Entity Name
              const targetEntity = definition.entities.find(e => e.name === change.targetId);
              if (!targetEntity) throw new Error(`Entity ${change.targetId} not found`);
              if (targetEntity.fields.find(f => f.name === change.payload.name)) {
                  throw new Error(`Field ${change.payload.name} already exists on ${change.targetId}`);
              }
              targetEntity.fields.push(change.payload);
              break;

          case 'MODIFY_FIELD':
               // targetId is "EntityName.FieldName"
               const [entName, fieldName] = change.targetId.split('.');
               const modEntity = definition.entities.find(e => e.name === entName);
               if (!modEntity) throw new Error(`Entity ${entName} not found`);
               const fieldIdx = modEntity.fields.findIndex(f => f.name === fieldName);
               if (fieldIdx === -1) throw new Error(`Field ${fieldName} not found on ${entName}`);
               modEntity.fields[fieldIdx] = { ...modEntity.fields[fieldIdx], ...change.payload };
               break;

          case 'ADD_VOCAB':
              await this.registry.createVocabulary(change.payload.name, change.payload.description, change.payload.concepts);
              break;

          case 'MODIFY_VOCAB':
               // Assume payload contains new concept
               if (change.payload.newConcept) {
                   await this.registry.addConceptToVocabulary(change.targetId, change.payload.newConcept);
               }
               break;

          default:
              console.warn(`Unknown change type: ${change.type}`);
      }
  }

  public calculateImpact(crId: string): any {
      const cr = this.changeRequests.get(crId);
      if (!cr) return {};

      const impact = {
          affectedServices: [] as string[],
          affectedDatasets: [] as string[],
          breakingChanges: false
      };

      // Naive analysis
      for (const change of cr.proposedChanges) {
          if (change.type.includes('MODIFY') || change.type.includes('DEPRECATE')) {
              impact.affectedServices.push('all-consumers');
              impact.breakingChanges = true;
          }
          if (change.type === 'ADD_FIELD') {
             impact.affectedServices.push('ingest-service');
          }
      }

      return impact;
  }
}
