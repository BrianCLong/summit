/**
 * RDF Triple Store implementation with SPARQL support
 */

import { Triple, TripleStoreConfig } from '../types.js';
import { Logger } from '../utils/Logger.js';
import * as rdf from 'rdflib';

export class TripleStore {
  private store: rdf.Store;
  private config: TripleStoreConfig;
  private logger: Logger;
  private prefixes: Map<string, string>;

  constructor(config: TripleStoreConfig) {
    this.config = config;
    this.logger = new Logger('TripleStore');
    this.store = rdf.graph();
    this.prefixes = new Map(Object.entries(config.prefixes || {}));

    // Add common prefixes
    this.addPrefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#');
    this.addPrefix('rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
    this.addPrefix('owl', 'http://www.w3.org/2002/07/owl#');
    this.addPrefix('xsd', 'http://www.w3.org/2001/XMLSchema#');
  }

  /**
   * Add a prefix for namespace abbreviation
   */
  addPrefix(prefix: string, uri: string): void {
    this.prefixes.set(prefix, uri);
  }

  /**
   * Expand a prefixed URI
   */
  expandUri(uri: string): string {
    if (uri.includes(':')) {
      const [prefix, local] = uri.split(':', 2);
      const namespace = this.prefixes.get(prefix);
      if (namespace) {
        return namespace + local;
      }
    }
    return uri;
  }

  /**
   * Add a triple to the store
   */
  addTriple(triple: Triple): void {
    const subject = rdf.sym(this.expandUri(triple.subject));
    const predicate = rdf.sym(this.expandUri(triple.predicate));

    let object: any;
    if (typeof triple.object === 'string' && triple.object.startsWith('http')) {
      object = rdf.sym(triple.object);
    } else if (typeof triple.object === 'string') {
      object = rdf.literal(triple.object);
    } else if (typeof triple.object === 'number') {
      object = rdf.literal(triple.object.toString(), rdf.sym('http://www.w3.org/2001/XMLSchema#decimal'));
    } else if (typeof triple.object === 'boolean') {
      object = rdf.literal(triple.object.toString(), rdf.sym('http://www.w3.org/2001/XMLSchema#boolean'));
    } else {
      object = rdf.literal(String(triple.object));
    }

    const graph = triple.graph ? rdf.sym(this.expandUri(triple.graph)) : undefined;

    this.store.add(subject, predicate, object, graph);
    this.logger.debug(`Added triple: ${triple.subject} ${triple.predicate} ${triple.object}`);
  }

  /**
   * Add multiple triples
   */
  addTriples(triples: Triple[]): void {
    triples.forEach(triple => this.addTriple(triple));
  }

  /**
   * Remove a triple from the store
   */
  removeTriple(triple: Triple): void {
    const subject = rdf.sym(this.expandUri(triple.subject));
    const predicate = rdf.sym(this.expandUri(triple.predicate));
    const object = typeof triple.object === 'string' ? rdf.sym(this.expandUri(triple.object)) : rdf.literal(String(triple.object));
    const graph = triple.graph ? rdf.sym(this.expandUri(triple.graph)) : undefined;

    this.store.remove(subject, predicate, object, graph);
  }

  /**
   * Query triples matching a pattern
   */
  match(subject?: string, predicate?: string, object?: string, graph?: string): Triple[] {
    const s = subject ? rdf.sym(this.expandUri(subject)) : null;
    const p = predicate ? rdf.sym(this.expandUri(predicate)) : null;
    const o = object ? (object.startsWith('http') ? rdf.sym(object) : rdf.literal(object)) : null;
    const g = graph ? rdf.sym(this.expandUri(graph)) : null;

    const statements = this.store.match(s, p, o, g);

    return statements.map(stmt => ({
      subject: stmt.subject.value,
      predicate: stmt.predicate.value,
      object: stmt.object.value,
      graph: stmt.graph?.value
    }));
  }

  /**
   * Execute a SPARQL query
   */
  async sparqlQuery(query: string): Promise<any[]> {
    // For now, return empty results
    // Full SPARQL implementation would use a library like sparqljs
    this.logger.warn('SPARQL query execution not fully implemented');
    return [];
  }

  /**
   * Get all triples for a subject
   */
  getEntity(subjectUri: string): Triple[] {
    return this.match(subjectUri);
  }

  /**
   * Get all subjects of a certain type
   */
  getEntitiesByType(typeUri: string): string[] {
    const triples = this.match(undefined, 'rdf:type', typeUri);
    return triples.map(t => t.subject);
  }

  /**
   * Export store as N-Triples
   */
  exportNTriples(): string {
    return rdf.serialize(undefined, this.store, undefined, 'application/n-triples');
  }

  /**
   * Export store as Turtle
   */
  exportTurtle(): string {
    return rdf.serialize(undefined, this.store, undefined, 'text/turtle');
  }

  /**
   * Import N-Triples
   */
  async importNTriples(data: string): Promise<void> {
    await rdf.parse(data, this.store, 'http://example.org/', 'application/n-triples');
  }

  /**
   * Import Turtle
   */
  async importTurtle(data: string): Promise<void> {
    await rdf.parse(data, this.store, 'http://example.org/', 'text/turtle');
  }

  /**
   * Get store statistics
   */
  getStatistics(): {
    tripleCount: number;
    subjectCount: number;
    predicateCount: number;
  } {
    const statements = this.store.statements;
    const subjects = new Set<string>();
    const predicates = new Set<string>();

    statements.forEach(stmt => {
      subjects.add(stmt.subject.value);
      predicates.add(stmt.predicate.value);
    });

    return {
      tripleCount: statements.length,
      subjectCount: subjects.size,
      predicateCount: predicates.size
    };
  }

  /**
   * Clear all triples
   */
  clear(): void {
    this.store = rdf.graph();
    this.logger.info('Triple store cleared');
  }

  /**
   * Check if a triple exists
   */
  hasTriple(subject: string, predicate: string, object: string): boolean {
    const matches = this.match(subject, predicate, object);
    return matches.length > 0;
  }
}
