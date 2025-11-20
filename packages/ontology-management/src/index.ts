/**
 * Ontology Management Package
 */

export interface OntologyClass {
  uri: string;
  label: string;
  description?: string;
  superClasses: string[];
  properties: OntologyProperty[];
  disjointWith?: string[];
}

export interface OntologyProperty {
  uri: string;
  label: string;
  domain: string[];
  range: string[];
  type: 'ObjectProperty' | 'DatatypeProperty' | 'AnnotationProperty';
  functional?: boolean;
  inverse?: string;
  transitive?: boolean;
  symmetric?: boolean;
}

export interface Ontology {
  uri: string;
  version: string;
  imports: string[];
  classes: OntologyClass[];
  properties: OntologyProperty[];
  individuals: OntologyIndividual[];
}

export interface OntologyIndividual {
  uri: string;
  types: string[];
  properties: Record<string, any>;
}

export class OntologyManager {
  private ontologies: Map<string, Ontology> = new Map();

  loadOntology(ontology: Ontology): void {
    this.ontologies.set(ontology.uri, ontology);
  }

  getClass(uri: string): OntologyClass | undefined {
    for (const ontology of this.ontologies.values()) {
      const cls = ontology.classes.find(c => c.uri === uri);
      if (cls) return cls;
    }
    return undefined;
  }

  getSuperClasses(classUri: string): OntologyClass[] {
    const cls = this.getClass(classUri);
    if (!cls) return [];

    return cls.superClasses
      .map(uri => this.getClass(uri))
      .filter(Boolean) as OntologyClass[];
  }

  getSubClasses(classUri: string): OntologyClass[] {
    const subclasses: OntologyClass[] = [];

    for (const ontology of this.ontologies.values()) {
      for (const cls of ontology.classes) {
        if (cls.superClasses.includes(classUri)) {
          subclasses.push(cls);
        }
      }
    }

    return subclasses;
  }

  validateInstance(instance: OntologyIndividual): boolean {
    for (const typeUri of instance.types) {
      const cls = this.getClass(typeUri);
      if (!cls) return false;

      // Validate properties against class definition
      for (const [propUri, value] of Object.entries(instance.properties)) {
        const prop = cls.properties.find(p => p.uri === propUri);
        if (!prop) {
          // Property not defined in class
          continue;
        }

        // Check domain
        if (!prop.domain.includes(typeUri)) {
          return false;
        }
      }
    }

    return true;
  }

  inferTypes(instance: OntologyIndividual): string[] {
    const inferred: string[] = [...instance.types];

    // Add all super classes
    for (const type of instance.types) {
      const superClasses = this.getSuperClasses(type);
      inferred.push(...superClasses.map(c => c.uri));
    }

    return Array.from(new Set(inferred));
  }
}

export { OntologyManager as default };
