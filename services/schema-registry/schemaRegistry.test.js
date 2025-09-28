const fs = require('fs');
const path = require('path');
const { SchemaRegistry } = require('./schemaRegistry');

describe('SchemaRegistry', () => {
  const tempStore = path.join(__dirname, '__test-store.json');

  afterEach(() => {
    if (fs.existsSync(tempStore)) {
      fs.unlinkSync(tempStore);
    }
  });

  test('registers compatible Avro schemas with automatic semver bump', () => {
    const registry = new SchemaRegistry(tempStore);
    const baseSchema = {
      type: 'record',
      name: 'CustomerProfile',
      fields: [
        { name: 'customer_id', type: 'string', 'x-tags': ['key'] },
        { name: 'email', type: 'string', pii: true, default: '' },
      ],
    };

    const first = registry.registerVersion('customer-profile', {
      type: 'avro',
      schema: baseSchema,
    });

    expect(first.version).toBe('1.0.0');
    expect(first.metadata.piiTagged).toContain('email');

    const evolvedSchema = {
      ...baseSchema,
      fields: [
        ...baseSchema.fields,
        { name: 'country', type: 'string', default: 'US' },
      ],
    };

    const second = registry.registerVersion('customer-profile', {
      type: 'avro',
      schema: evolvedSchema,
    });

    expect(second.version).toBe('1.0.1');
    expect(second.compatibility.compatible).toBe(true);
    expect(registry.getLatestVersion('customer-profile').version).toBe('1.0.1');
  });

  test('rejects incompatible Avro changes', () => {
    const registry = new SchemaRegistry(tempStore);
    const schema = {
      type: 'record',
      name: 'CustomerProfile',
      fields: [
        { name: 'customer_id', type: 'string', 'x-tags': ['key'] },
      ],
    };

    registry.registerVersion('customer-profile', { type: 'avro', schema });

    expect(() =>
      registry.registerVersion('customer-profile', {
        type: 'avro',
        schema: {
          ...schema,
          fields: [{ name: 'customer_id', type: 'int' }],
        },
      })
    ).toThrow(/not backward compatible/);
  });

  test('validates protobuf schemas without persisting them', () => {
    const registry = new SchemaRegistry(tempStore);
    const proto = `syntax = "proto3";
      message CustomerProfile {
        string customer_id = 1 [retain="P3M"];
        string email = 2 [pii=true, retain="P3M"];
      }
    `;

    registry.registerVersion('customer-profile', { type: 'protobuf', schema: proto });

    const validation = registry.validate('customer-profile', {
      type: 'protobuf',
      schema: `syntax = "proto3";
        message CustomerProfile {
          string customer_id = 1 [retain="P3M"];
          string email = 2 [pii=true, retain="P3M"];
          string locale = 3 [retain="P1Y"];
        }
      `,
    });

    expect(validation.compatibility.compatible).toBe(true);
    expect(validation.lint.errors).toHaveLength(0);
    expect(registry.getLatestVersion('customer-profile').version).toBe('1.0.0');
  });
});
