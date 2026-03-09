// src/ingest/schemaRegistry.ts

/**
 * A more realistic, in-memory schema registry for testing and local development.
 * This simulates a remote schema registry service.
 */
class InMemorySchemaRegistry {
  private subjects: Map<string, any[]> = new Map();

  public register(subject: string, schema: any): string {
    if (!this.subjects.has(subject)) {
      this.subjects.set(subject, []);
    }
    const versions = this.subjects.get(subject)!;
    const schemaId = (versions.length + 1).toString();
    versions.push({ ...schema, schemaId });
    this.subjects.set(subject, versions);
    return schemaId;
  }

  public getSchema(subject: string, schemaId: string): any | undefined {
    const versions = this.subjects.get(subject);
    if (!versions) {
      return undefined;
    }
    return versions.find(v => v.schemaId === schemaId);
  }

  public checkCompatibility(subject: string, newSchema: any): { ok: boolean; errors?: string[] } {
    const versions = this.subjects.get(subject);
    // If there are fewer than 2 versions, there's nothing to compare against.
    if (!versions || versions.length < 2) {
      return { ok: true };
    }

    // The schema passed to this function will have a schemaId from when it was retrieved.
    const currentIndex = versions.findIndex(v => v.schemaId === newSchema.schemaId);

    // If it's the first version in the array, it's compatible by default.
    if (currentIndex <= 0) {
      return { ok: true };
    }

    const predecessorSchema = versions[currentIndex - 1];
    const predecessorProperties = predecessorSchema.properties || {};
    const newProperties = newSchema.properties || {};

    // Check for removed fields (the core of a BACKWARD compatibility check)
    for (const key in predecessorProperties) {
      if (!newProperties[key]) {
        return {
          ok: false,
          errors: [`Field "${key}" was removed, breaking backward compatibility.`],
        };
      }
    }

    return { ok: true };
  }
}

// Export a singleton instance to act as our mock registry service
export const schemaRegistryClient = new InMemorySchemaRegistry();

/**
 * Gets a schema from the in-memory registry.
 */
export async function getSchema(subject: string, schemaId: string): Promise<any> {
  const schema = schemaRegistryClient.getSchema(subject, schemaId);
  if (!schema) {
    throw new Error(`Schema with ID "${schemaId}" not found for subject "${subject}".`);
  }
  return Promise.resolve(schema);
}

/**
 * Checks compatibility against the in-memory registry.
 */
export async function checkCompatibility(subject: string, schema: any): Promise<{ ok: boolean; errors?: string[] }> {
  const result = schemaRegistryClient.checkCompatibility(subject, schema);
  return Promise.resolve(result);
}
