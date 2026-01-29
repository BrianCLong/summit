import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ParsedArgs, parse } from 'node:util';

const registryPath = resolve(__dirname, '../../federation/registry/registry.json');

/**
 * Queries the federated evidence registry.
 * @param query The query to execute.
 * @returns A promise that resolves with the query results.
 */
export async function queryRegistry(query: { [key: string]: string }): Promise<any[]> {
  const registry = JSON.parse(readFileSync(registryPath, 'utf-8'));

  return registry.filter((entry: any) => {
    for (const key in query) {
      if (entry[key] !== query[key]) {
        return false;
      }
    }
    return true;
  });
}

// Example usage:
if (require.main === module) {
  (async () => {
    try {
      const { values: query } = parse({
        options: {
          repo: { type: 'string' },
          tag: { type: 'string' },
          control_id: { type: 'string' },
          customer: { type: 'string' },
          'date-range-start': { type: 'string' },
          'date-range-end': { type: 'string' },
        },
      });

      const results = await queryRegistry(query as { [key: string]: string });
      console.log(JSON.stringify(results, null, 2));
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  })();
}
