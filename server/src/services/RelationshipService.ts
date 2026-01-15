import type { Driver } from 'neo4j-driver';

export interface RelationshipSuggestion {
  type: string;
  weight: number;
}

export class RelationshipService {
  private driver: Driver | null = null;

  setDriver(driver: Driver) {
    this.driver = driver;
  }

  suggestRelationshipTypes(
    _sourceType?: string,
    _targetType?: string,
  ): RelationshipSuggestion[] {
    // Default heuristic: rely on upstream services to inject smarter logic.
    return [];
  }
}
