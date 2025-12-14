
import { SchemaVersion, SchemaDefinition, Vocabulary, Concept, ChangeRequest, SchemaStatus } from './models';
import { randomUUID } from 'crypto';
import { FilePersistenceAdapter, PersistenceAdapter } from './persistence';

export class SchemaRegistryService {
  private static instance: SchemaRegistryService;

  private schemas: Map<string, SchemaVersion> = new Map();
  private vocabularies: Map<string, Vocabulary> = new Map();
  private activeVersionId: string | null = null;

  private schemaRepo: PersistenceAdapter<SchemaVersion>;
  private vocabRepo: PersistenceAdapter<Vocabulary>;

  private constructor() {
    this.schemaRepo = new FilePersistenceAdapter<SchemaVersion>('schemas');
    this.vocabRepo = new FilePersistenceAdapter<Vocabulary>('vocabularies');

    // Async init is tricky in constructor, but for singleton usually we rely on init() or blocking loading
    // For this implementation, we'll trigger a load and let it settle.
    this.loadFromPersistence().then(() => {
        if (this.schemas.size === 0) {
            this.initializeBootstrapSchema();
        }
    });
  }

  public static getInstance(): SchemaRegistryService {
    if (!SchemaRegistryService.instance) {
      SchemaRegistryService.instance = new SchemaRegistryService();
    }
    return SchemaRegistryService.instance;
  }

  // Expose a method to ensure data is loaded for tests/startup
  public async ensureInitialized(): Promise<void> {
      if (this.schemas.size === 0) {
          await this.loadFromPersistence();
          if (this.schemas.size === 0) {
              await this.initializeBootstrapSchema();
          }
      }
  }

  private async loadFromPersistence() {
      const schemas = await this.schemaRepo.list();
      schemas.forEach(s => {
          // Convert date strings back to objects
          s.createdAt = new Date(s.createdAt);
          if (s.approvedAt) s.approvedAt = new Date(s.approvedAt);

          this.schemas.set(s.id, s);
          if (s.status === 'ACTIVE') {
              // If multiple active (shouldn't happen), take latest
              if (!this.activeVersionId || s.createdAt > (this.schemas.get(this.activeVersionId)?.createdAt || new Date(0))) {
                  this.activeVersionId = s.id;
              }
          }
      });

      const vocabularies = await this.vocabRepo.list();
      vocabularies.forEach(v => this.vocabularies.set(v.id, v));
  }

  // --- Schema Management ---

  public getLatestSchema(): SchemaVersion | null {
    if (!this.activeVersionId) return null;
    return this.schemas.get(this.activeVersionId) || null;
  }

  public getSchema(version: string): SchemaVersion | undefined {
    for (const schema of this.schemas.values()) {
      if (schema.version === version) return schema;
    }
    return undefined;
  }

  public getSchemaById(id: string): SchemaVersion | undefined {
    return this.schemas.get(id);
  }

  public listSchemas(): SchemaVersion[] {
    return Array.from(this.schemas.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async registerSchema(definition: SchemaDefinition, changelog: string, author: string): Promise<SchemaVersion> {
    const previousVersion = this.getLatestSchema();
    const newVersionString = this.incrementVersion(previousVersion?.version || '0.0.0');

    const newSchema: SchemaVersion = {
      id: randomUUID(),
      version: newVersionString,
      definition,
      changelog,
      status: 'DRAFT',
      createdAt: new Date(),
      createdBy: author,
    };

    this.schemas.set(newSchema.id, newSchema);
    await this.schemaRepo.save(newSchema.id, newSchema);
    return newSchema;
  }

  public async activateSchema(id: string, approver: string): Promise<void> {
    const schema = this.schemas.get(id);
    if (!schema) throw new Error('Schema not found');

    // Deprecate current active
    if (this.activeVersionId) {
        const current = this.schemas.get(this.activeVersionId);
        if (current) {
            current.status = 'DEPRECATED';
            await this.schemaRepo.save(current.id, current);
        }
    }

    schema.status = 'ACTIVE';
    schema.approvedBy = approver;
    schema.approvedAt = new Date();
    this.activeVersionId = id;
    await this.schemaRepo.save(schema.id, schema);
  }

  // --- Vocabulary Management ---

  public getVocabulary(id: string): Vocabulary | undefined {
    return this.vocabularies.get(id);
  }

  public listVocabularies(): Vocabulary[] {
    return Array.from(this.vocabularies.values());
  }

  public async createVocabulary(name: string, description: string, concepts: Concept[] = []): Promise<Vocabulary> {
    const vocab: Vocabulary = {
      id: randomUUID(),
      name,
      description,
      concepts,
      version: '1.0.0'
    };
    this.vocabularies.set(vocab.id, vocab);
    await this.vocabRepo.save(vocab.id, vocab);
    return vocab;
  }

  public async addConceptToVocabulary(vocabId: string, concept: Concept): Promise<void> {
    const vocab = this.vocabularies.get(vocabId);
    if (!vocab) throw new Error('Vocabulary not found');
    vocab.concepts.push(concept);
    await this.vocabRepo.save(vocab.id, vocab);
  }

  // --- Helpers ---

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    if (parts.length !== 3) return '1.0.0';
    parts[1] += 1;
    return parts.join('.');
  }

  private async initializeBootstrapSchema() {
    // Check if we already have data (safety check, though caller logic handles this)
    if (this.schemas.size > 0) return;

    // Stable ID for bootstrap schema
    const BOOTSTRAP_SCHEMA_ID = '00000000-0000-0000-0000-000000000001';

    const bootstrapDefinition: SchemaDefinition = {
      entities: [
        {
          name: 'Person',
          description: 'A natural person',
          fields: [
            { name: 'fullName', type: 'string', description: 'Full legal name', required: true, sensitive: false, pii: true },
            { name: 'dateOfBirth', type: 'date', description: 'Date of birth', required: false, sensitive: true, pii: true }
          ],
          constraints: []
        },
        {
          name: 'Organization',
          description: 'A legal entity or group',
          fields: [
            { name: 'name', type: 'string', description: 'Organization name', required: true, sensitive: false, pii: false },
            { name: 'registrationNumber', type: 'string', description: 'Registration or Tax ID', required: false, sensitive: false, pii: false }
          ],
          constraints: []
        }
      ],
      edges: [
        {
          name: 'EMPLOYED_BY',
          description: 'Employment relationship',
          sourceType: 'Person',
          targetType: 'Organization',
          fields: [
             { name: 'role', type: 'string', description: 'Job title', required: true, sensitive: false, pii: false },
             { name: 'startDate', type: 'date', description: 'Start date', required: true, sensitive: false, pii: false }
          ]
        }
      ]
    };

    const bootstrapSchema: SchemaVersion = {
      id: BOOTSTRAP_SCHEMA_ID,
      version: '1.0.0',
      definition: bootstrapDefinition,
      changelog: 'Initial bootstrap schema',
      status: 'ACTIVE',
      createdAt: new Date(), // This will update on first run, which is acceptable
      createdBy: 'system',
      approvedBy: 'system',
      approvedAt: new Date()
    };

    this.schemas.set(bootstrapSchema.id, bootstrapSchema);
    this.activeVersionId = bootstrapSchema.id;
    await this.schemaRepo.save(bootstrapSchema.id, bootstrapSchema);

    // Bootstrap Risk Levels
    const riskVocabId = '00000000-0000-0000-0000-000000000002';
    const riskVocab: Vocabulary = {
        id: riskVocabId,
        name: 'RiskLevels',
        description: 'Standard risk levels',
        version: '1.0.0',
        concepts: [
            { id: 'risk-low', term: 'Low', description: 'Low risk', semanticType: 'risk_level', aliases: [], deprecated: false, supersedes: [] },
            { id: 'risk-med', term: 'Medium', description: 'Medium risk', semanticType: 'risk_level', aliases: [], deprecated: false, supersedes: [] },
            { id: 'risk-high', term: 'High', description: 'High risk', semanticType: 'risk_level', aliases: [], deprecated: false, supersedes: [] }
        ]
    };
    this.vocabularies.set(riskVocab.id, riskVocab);
    await this.vocabRepo.save(riskVocab.id, riskVocab);
  }
}
