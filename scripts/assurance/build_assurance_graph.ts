import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const registryPath = resolve(__dirname, '../../federation/registry/registry.json');
const graphSchemaPath = resolve(__dirname, '../../schemas/assurance/assurance_graph.schema.json');

/**
 * Builds the unified assurance graph from the federation registry.
 */
export async function buildAssuranceGraph(): Promise<void> {
  const registry = JSON.parse(readFileSync(registryPath, 'utf-8'));
  const graphSchema = JSON.parse(readFileSync(graphSchemaPath, 'utf-8'));

  const graph = {
    entities: [],
    relationships: [],
  };

  for (const entry of registry) {
    const bundle = JSON.parse(readFileSync(entry.bundle_path, 'utf-8'));

    // Create a Repo entity
    graph.entities.push({
      id: bundle.source_repo,
      type: 'Repo',
      data: {
        url: bundle.source_repo,
      },
    });

    // Create a Release entity
    graph.entities.push({
      id: `${bundle.source_repo}-${bundle.tag}`,
      type: 'Release',
      data: {
        tag: bundle.tag,
        sha: bundle.source_sha,
      },
    });

    // Create Artifact entities and PRODUCES relationships
    for (const artifactClass in bundle.artifact_index) {
      for (const artifact of bundle.artifact_index[artifactClass]) {
        graph.entities.push({
          id: `${bundle.source_repo}-${bundle.tag}-${artifact.path}`,
          type: 'Artifact',
          data: artifact,
        });

        graph.relationships.push({
          source: `${bundle.source_repo}-${bundle.tag}`,
          target: `${bundle.source_repo}-${bundle.tag}-${artifact.path}`,
          type: 'PRODUCES',
        });
      }
    }
  }

  // Write the graph to a file
  const date = new Date().toISOString().split('T')[0];
  const graphDir = resolve(__dirname, `../../artifacts/assurance-graph/${date}`);
  mkdirSync(graphDir, { recursive: true });
  writeFileSync(resolve(graphDir, 'graph.json'), JSON.stringify(graph, null, 2));
}

// Example usage:
if (require.main === module) {
  (async () => {
    try {
      await buildAssuranceGraph();
      console.log('Assurance graph built successfully.');
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  })();
}
