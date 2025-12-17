import { SchemaCatalogService, SchemaDefinition } from '../SchemaCatalogService.js';
import fs from 'fs/promises';
import path from 'path';

describe('SchemaCatalogService', () => {
  let service: SchemaCatalogService;
  const mockStoragePath = path.join(process.cwd(), 'data', 'schema-catalog.json');

  beforeEach(async () => {
    // Clean up mock file
    try {
      await fs.unlink(mockStoragePath);
    } catch {}

    // Reset singleton state via private access or just rely on file reload
    service = SchemaCatalogService.getInstance();
    (service as any).currentSchema = null;
  });

  afterAll(async () => {
    try {
        await fs.unlink(mockStoragePath);
    } catch {}
  });

  const validSchema: SchemaDefinition = {
    version: '1.0.0',
    entities: {
      User: {
        fields: {
          id: 'string',
          email: 'string',
        },
        policy: [
          { field: 'email', purpose: 'identification', retention: 'permanent', pii: true },
          { field: 'id', purpose: 'primary_key', retention: 'permanent' }
        ]
      }
    }
  };

  it('should register a valid schema and persist it', async () => {
    const result = await service.registerSchema(validSchema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);

    // Verify persistence
    const savedData = await fs.readFile(mockStoragePath, 'utf-8');
    const savedSchema = JSON.parse(savedData);
    expect(savedSchema.version).toBe('1.0.0');
  });

  it('should detect breaking changes across instances (persistence check)', async () => {
    // 1. Register V1
    await service.registerSchema(validSchema);

    // 2. Simulate new service instance (reload from disk)
    (service as any).currentSchema = null;

    // 3. Register V2 with breaking change
    const newSchema: SchemaDefinition = {
      version: '2.0.0',
      entities: {
        User: {
          fields: {
            id: 'string',
            // email removed
          },
          policy: [
            { field: 'id', purpose: 'primary_key', retention: 'permanent' }
          ]
        }
      }
    };

    const result = await service.registerSchema(newSchema);
    expect(result.valid).toBe(false);
    expect(result.breakingChanges).toHaveLength(1);
    expect(result.breakingChanges[0]).toContain("Field 'User.email' was removed");
  });
});
