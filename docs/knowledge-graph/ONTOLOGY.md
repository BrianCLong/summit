# Knowledge Graph Ontology Guide

## Overview

This document describes the ontology design, schema management, and semantic modeling capabilities of Summit's Knowledge Graph platform.

## Table of Contents

1. [Ontology Basics](#ontology-basics)
2. [Class Hierarchy](#class-hierarchy)
3. [Property Definitions](#property-definitions)
4. [Constraints and Validation](#constraints-and-validation)
5. [Ontology Versioning](#ontology-versioning)
6. [Best Practices](#best-practices)

## Ontology Basics

### What is an Ontology?

An ontology defines the types of entities, their properties, and relationships in your domain. It provides:

- **Classes**: Types of entities (Person, Organization, Location)
- **Properties**: Attributes and relationships
- **Constraints**: Rules and validations
- **Hierarchies**: Parent-child relationships between types

### OWL and RDFS

The platform supports Web Ontology Language (OWL) and RDF Schema (RDFS) standards:

```typescript
import { OntologyManager } from '@summit/ontology-management';

const ontology: Ontology = {
  uri: 'http://summit.io/ontology/core',
  version: '1.0.0',
  imports: [
    'http://www.w3.org/2002/07/owl#',
    'http://www.w3.org/2000/01/rdf-schema#'
  ],
  classes: [
    // Define classes
  ],
  properties: [
    // Define properties
  ],
  individuals: [
    // Define instances
  ]
};

const manager = new OntologyManager();
manager.loadOntology(ontology);
```

## Class Hierarchy

### Defining Classes

```typescript
const personClass: OntologyClass = {
  uri: 'http://summit.io/ontology/Person',
  label: 'Person',
  description: 'A human being',
  superClasses: ['http://www.w3.org/2002/07/owl#Thing'],
  properties: [
    {
      uri: 'http://summit.io/ontology/firstName',
      label: 'First Name',
      domain: ['http://summit.io/ontology/Person'],
      range: ['http://www.w3.org/2001/XMLSchema#string'],
      type: 'DatatypeProperty',
      functional: true
    },
    {
      uri: 'http://summit.io/ontology/lastName',
      label: 'Last Name',
      domain: ['http://summit.io/ontology/Person'],
      range: ['http://www.w3.org/2001/XMLSchema#string'],
      type: 'DatatypeProperty',
      functional: true
    },
    {
      uri: 'http://summit.io/ontology/age',
      label: 'Age',
      domain: ['http://summit.io/ontology/Person'],
      range: ['http://www.w3.org/2001/XMLSchema#integer'],
      type: 'DatatypeProperty'
    }
  ],
  disjointWith: ['http://summit.io/ontology/Organization']
};
```

### Class Hierarchies

```typescript
// Define subclasses
const employeeClass: OntologyClass = {
  uri: 'http://summit.io/ontology/Employee',
  label: 'Employee',
  description: 'A person employed by an organization',
  superClasses: ['http://summit.io/ontology/Person'],
  properties: [
    {
      uri: 'http://summit.io/ontology/employeeId',
      label: 'Employee ID',
      domain: ['http://summit.io/ontology/Employee'],
      range: ['http://www.w3.org/2001/XMLSchema#string'],
      type: 'DatatypeProperty',
      functional: true
    },
    {
      uri: 'http://summit.io/ontology/worksFor',
      label: 'Works For',
      domain: ['http://summit.io/ontology/Employee'],
      range: ['http://summit.io/ontology/Organization'],
      type: 'ObjectProperty'
    }
  ]
};

// Customer is another subclass of Person
const customerClass: OntologyClass = {
  uri: 'http://summit.io/ontology/Customer',
  label: 'Customer',
  superClasses: ['http://summit.io/ontology/Person'],
  properties: [
    {
      uri: 'http://summit.io/ontology/customerId',
      label: 'Customer ID',
      domain: ['http://summit.io/ontology/Customer'],
      range: ['http://www.w3.org/2001/XMLSchema#string'],
      type: 'DatatypeProperty',
      functional: true
    }
  ]
};
```

### Query Class Hierarchy

```typescript
// Get all superclasses
const superClasses = manager.getSuperClasses('http://summit.io/ontology/Employee');

// Get all subclasses
const subClasses = manager.getSubClasses('http://summit.io/ontology/Person');

// Get class definition
const cls = manager.getClass('http://summit.io/ontology/Person');
```

## Property Definitions

### Datatype Properties

Properties with literal values:

```typescript
const properties: OntologyProperty[] = [
  {
    uri: 'http://summit.io/ontology/name',
    label: 'Name',
    domain: ['http://summit.io/ontology/Person'],
    range: ['http://www.w3.org/2001/XMLSchema#string'],
    type: 'DatatypeProperty',
    functional: true  // Can have only one value
  },
  {
    uri: 'http://summit.io/ontology/birthDate',
    label: 'Birth Date',
    domain: ['http://summit.io/ontology/Person'],
    range: ['http://www.w3.org/2001/XMLSchema#date'],
    type: 'DatatypeProperty'
  },
  {
    uri: 'http://summit.io/ontology/email',
    label: 'Email',
    domain: ['http://summit.io/ontology/Person'],
    range: ['http://www.w3.org/2001/XMLSchema#string'],
    type: 'DatatypeProperty'
  }
];
```

### Object Properties

Properties linking entities:

```typescript
const objectProperties: OntologyProperty[] = [
  {
    uri: 'http://summit.io/ontology/knows',
    label: 'Knows',
    domain: ['http://summit.io/ontology/Person'],
    range: ['http://summit.io/ontology/Person'],
    type: 'ObjectProperty',
    symmetric: true  // If A knows B, then B knows A
  },
  {
    uri: 'http://summit.io/ontology/parentOf',
    label: 'Parent Of',
    domain: ['http://summit.io/ontology/Person'],
    range: ['http://summit.io/ontology/Person'],
    type: 'ObjectProperty',
    inverse: 'http://summit.io/ontology/childOf'
  },
  {
    uri: 'http://summit.io/ontology/ancestorOf',
    label: 'Ancestor Of',
    domain: ['http://summit.io/ontology/Person'],
    range: ['http://summit.io/ontology/Person'],
    type: 'ObjectProperty',
    transitive: true  // If A ancestor of B, and B ancestor of C, then A ancestor of C
  }
];
```

## Constraints and Validation

### Domain and Range Constraints

```typescript
// This property can only be applied to Person instances
// and must have Organization instances as values
const worksForProperty: OntologyProperty = {
  uri: 'http://summit.io/ontology/worksFor',
  label: 'Works For',
  domain: ['http://summit.io/ontology/Person'],
  range: ['http://summit.io/ontology/Organization'],
  type: 'ObjectProperty'
};
```

### Cardinality Constraints

```typescript
// Functional property: max 1 value
{
  uri: 'http://summit.io/ontology/socialSecurityNumber',
  functional: true,  // Person can have only one SSN
  type: 'DatatypeProperty'
}

// In full OWL, you can specify exact cardinality:
// - owl:minCardinality
// - owl:maxCardinality
// - owl:cardinality (exact)
```

### Validation

```typescript
// Validate an instance against ontology
const instance: OntologyIndividual = {
  uri: 'http://summit.io/data/john_doe',
  types: ['http://summit.io/ontology/Person'],
  properties: {
    'http://summit.io/ontology/firstName': 'John',
    'http://summit.io/ontology/lastName': 'Doe',
    'http://summit.io/ontology/age': 35
  }
};

const isValid = manager.validateInstance(instance);
console.log(`Instance is ${isValid ? 'valid' : 'invalid'}`);
```

### Disjoint Classes

```typescript
// Person and Organization are disjoint - no instance can be both
const personClass: OntologyClass = {
  // ...
  disjointWith: ['http://summit.io/ontology/Organization']
};
```

## Ontology Versioning

### Version Management

```typescript
const ontologyV1: Ontology = {
  uri: 'http://summit.io/ontology/core',
  version: '1.0.0',
  classes: [
    // Initial classes
  ]
};

const ontologyV2: Ontology = {
  uri: 'http://summit.io/ontology/core',
  version: '2.0.0',
  classes: [
    // Updated classes with new properties
  ]
};

// Load specific version
manager.loadOntology(ontologyV2);
```

### Schema Evolution

When evolving ontologies:

1. **Additive Changes** (safe):
   - Adding new classes
   - Adding new properties
   - Adding new subclasses

2. **Breaking Changes** (require migration):
   - Removing classes
   - Removing properties
   - Changing property domains/ranges
   - Changing class hierarchies

```typescript
// Migration example
async function migrateV1ToV2() {
  // Add new property to all existing instances
  const instances = await kg.query(`
    MATCH (n:Person)
    RETURN n
  `);

  for (const instance of instances.data) {
    await kg.updateEntity(instance.n.properties.nodeId, {
      // Add new required property with default value
      department: 'Unknown'
    });
  }
}
```

## Best Practices

### 1. Ontology Design Principles

**Top-down vs. Bottom-up**
- Top-down: Start with high-level concepts, refine downwards
- Bottom-up: Start with specific instances, generalize upwards
- Recommended: Use both approaches iteratively

**Naming Conventions**
```typescript
// Use CamelCase for classes
class: 'Person', 'Organization', 'DocumentTemplate'

// Use camelCase for properties
property: 'firstName', 'worksFor', 'createdAt'

// Use SCREAMING_SNAKE_CASE for relationship types in Neo4j
relationship: 'WORKS_AT', 'KNOWS', 'PARENT_OF'
```

**URI Structure**
```
http://summit.io/ontology/{OntologyName}#{ClassName}
http://summit.io/ontology/core#Person
http://summit.io/ontology/core#worksFor
```

### 2. Reuse Existing Ontologies

Leverage standard ontologies:

```typescript
const ontology: Ontology = {
  uri: 'http://summit.io/ontology/core',
  version: '1.0.0',
  imports: [
    'http://xmlns.com/foaf/0.1/',           // Friend of a Friend
    'http://schema.org/',                    // Schema.org
    'http://www.w3.org/2006/time#',         // Time Ontology
    'http://www.w3.org/2003/01/geo/wgs84_pos#' // WGS84 Geo
  ],
  // ...
};
```

### 3. Document Your Ontology

```typescript
const welldocumentedClass: OntologyClass = {
  uri: 'http://summit.io/ontology/Person',
  label: 'Person',
  description: `
    A Person represents a human being in the system.
    This includes employees, customers, contractors, and other individuals.

    Subclasses:
    - Employee: Persons employed by organizations
    - Customer: Persons who purchase products/services

    Related:
    - Organization: Entities that employ or serve persons
  `,
  superClasses: ['http://www.w3.org/2002/07/owl#Thing'],
  properties: [
    // ...
  ]
};
```

### 4. Incremental Development

```typescript
// Start simple
const v1Classes = [
  'Person',
  'Organization'
];

// Add detail incrementally
const v2Classes = [
  'Person',
  'Employee extends Person',
  'Customer extends Person',
  'Organization',
  'Company extends Organization',
  'NonProfit extends Organization'
];

// Continue refining
const v3Classes = [
  // Even more specific types
];
```

### 5. Testing Ontologies

```typescript
// Test class hierarchy
describe('Ontology Tests', () => {
  test('Employee is a subclass of Person', () => {
    const superClasses = manager.getSuperClasses('Employee');
    expect(superClasses.map(c => c.uri)).toContain('Person');
  });

  test('Person and Organization are disjoint', () => {
    const person = manager.getClass('Person');
    expect(person.disjointWith).toContain('Organization');
  });

  test('Valid instance passes validation', () => {
    const instance = {
      uri: 'test:john',
      types: ['Person'],
      properties: { name: 'John' }
    };
    expect(manager.validateInstance(instance)).toBe(true);
  });
});
```

## Example Ontologies

### Intelligence Analysis Ontology

```typescript
const intelligenceOntology: Ontology = {
  uri: 'http://summit.io/ontology/intelligence',
  version: '1.0.0',
  classes: [
    // Entities
    { uri: 'Entity', label: 'Entity', superClasses: ['owl:Thing'] },
    { uri: 'Person', label: 'Person', superClasses: ['Entity'] },
    { uri: 'Organization', label: 'Organization', superClasses: ['Entity'] },
    { uri: 'Location', label: 'Location', superClasses: ['Entity'] },
    { uri: 'Event', label: 'Event', superClasses: ['Entity'] },
    { uri: 'Document', label: 'Document', superClasses: ['Entity'] },

    // Intelligence-specific
    { uri: 'Threat', label: 'Threat', superClasses: ['Entity'] },
    { uri: 'Indicator', label: 'Indicator', superClasses: ['Entity'] },
    { uri: 'ThreatActor', label: 'Threat Actor', superClasses: ['Entity'] },
    { uri: 'Campaign', label: 'Campaign', superClasses: ['Entity'] },
  ],
  properties: [
    {
      uri: 'relatedTo',
      label: 'Related To',
      domain: ['Entity'],
      range: ['Entity'],
      type: 'ObjectProperty'
    },
    {
      uri: 'attributedTo',
      label: 'Attributed To',
      domain: ['Campaign', 'Indicator'],
      range: ['ThreatActor'],
      type: 'ObjectProperty'
    },
    {
      uri: 'targets',
      label: 'Targets',
      domain: ['ThreatActor', 'Campaign'],
      range: ['Organization', 'Person'],
      type: 'ObjectProperty'
    },
    {
      uri: 'confidence',
      label: 'Confidence',
      domain: ['Entity'],
      range: ['xsd:decimal'],
      type: 'DatatypeProperty'
    }
  ]
};
```

## Summary

Ontologies provide the semantic foundation for knowledge graphs:

1. **Define clear class hierarchies** with proper inheritance
2. **Specify property constraints** for validation
3. **Reuse standard ontologies** where possible
4. **Version ontologies carefully** and plan migrations
5. **Document thoroughly** for maintainability
6. **Test rigorously** to ensure correctness

## References

- [OWL 2 Web Ontology Language](https://www.w3.org/TR/owl2-overview/)
- [RDF Schema](https://www.w3.org/TR/rdf-schema/)
- [Schema.org](https://schema.org/)
- [Friend of a Friend (FOAF)](http://xmlns.com/foaf/spec/)
- [Dublin Core Metadata](https://www.dublincore.org/)
