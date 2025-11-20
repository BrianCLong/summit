/**
 * Unit tests for DataTransformer
 */

import { DataTransformer } from '../transformation/DataTransformer';
import { TransformationConfig } from '@intelgraph/data-integration/src/types';
import { createLogger } from 'winston';

describe('DataTransformer', () => {
  let logger: any;

  beforeEach(() => {
    logger = createLogger({ silent: true });
  });

  describe('mapping transformation', () => {
    it('should map fields correctly', async () => {
      const config: TransformationConfig = {
        type: 'custom',
        transformations: [
          {
            id: 'map',
            name: 'Map fields',
            type: 'map',
            order: 1,
            config: {
              fieldMapping: {
                newName: 'oldName',
                newEmail: 'oldEmail'
              }
            }
          }
        ]
      };

      const data = [
        { oldName: 'John', oldEmail: 'john@example.com' },
        { oldName: 'Jane', oldEmail: 'jane@example.com' }
      ];

      const transformer = new DataTransformer(config, logger);
      const result = await transformer.transform(data);

      expect(result[0]).toHaveProperty('newName', 'John');
      expect(result[0]).toHaveProperty('newEmail', 'john@example.com');
      expect(result[1]).toHaveProperty('newName', 'Jane');
    });
  });

  describe('filter transformation', () => {
    it('should filter records', async () => {
      const config: TransformationConfig = {
        type: 'custom',
        transformations: [
          {
            id: 'filter',
            name: 'Filter active',
            type: 'filter',
            order: 1,
            config: {
              filterFunction: (record: any) => record.active === true
            }
          }
        ]
      };

      const data = [
        { id: 1, active: true },
        { id: 2, active: false },
        { id: 3, active: true }
      ];

      const transformer = new DataTransformer(config, logger);
      const result = await transformer.transform(data);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });
  });

  describe('normalization transformation', () => {
    it('should normalize string fields', async () => {
      const config: TransformationConfig = {
        type: 'custom',
        transformations: [
          {
            id: 'normalize',
            name: 'Normalize strings',
            type: 'normalize',
            order: 1,
            config: {
              stringFields: ['name', 'email']
            }
          }
        ]
      };

      const data = [
        { name: '  JOHN DOE  ', email: 'JOHN@EXAMPLE.COM' }
      ];

      const transformer = new DataTransformer(config, logger);
      const result = await transformer.transform(data);

      expect(result[0].name).toBe('john doe');
      expect(result[0].email).toBe('john@example.com');
    });
  });

  describe('type casting transformation', () => {
    it('should cast types correctly', async () => {
      const config: TransformationConfig = {
        type: 'custom',
        transformations: [
          {
            id: 'typecast',
            name: 'Cast types',
            type: 'typecast',
            order: 1,
            config: {
              typeMapping: {
                age: 'number',
                active: 'boolean',
                createdAt: 'date'
              }
            }
          }
        ]
      };

      const data = [
        { age: '25', active: '1', createdAt: '2024-01-01' }
      ];

      const transformer = new DataTransformer(config, logger);
      const result = await transformer.transform(data);

      expect(result[0].age).toBe(25);
      expect(typeof result[0].age).toBe('number');
      expect(result[0].active).toBe(true);
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });
  });

  describe('aggregation transformation', () => {
    it('should aggregate records', async () => {
      const config: TransformationConfig = {
        type: 'custom',
        transformations: [
          {
            id: 'aggregate',
            name: 'Aggregate by category',
            type: 'aggregate',
            order: 1,
            config: {
              groupBy: ['category'],
              aggregations: {
                amount: 'sum',
                count: 'count'
              }
            }
          }
        ]
      };

      const data = [
        { category: 'A', amount: 100 },
        { category: 'A', amount: 200 },
        { category: 'B', amount: 150 }
      ];

      const transformer = new DataTransformer(config, logger);
      const result = await transformer.transform(data);

      expect(result).toHaveLength(2);
      expect(result.find(r => r.category === 'A')?.amount_sum).toBe(300);
      expect(result.find(r => r.category === 'B')?.amount_sum).toBe(150);
    });
  });
});
