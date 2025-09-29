/**
 * NL→Cypher Guardrails Test Suite
 *
 * Tests constraint enforcement, explanation generation, and GraphQL resolvers
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { CypherConstraintEngine, DEFAULT_CONSTRAINT_CONFIG } from '../services/gateway/src/nl2cypher/guardrails/constraints';
import { CypherExplainer } from '../services/gateway/src/nl2cypher/guardrails/explain';
import { NlToCypherGuardrails } from '../services/gateway/src/nl2cypher/guardrails';

describe('CypherConstraintEngine', () => {
  let engine: CypherConstraintEngine;

  beforeEach(() => {
    engine = new CypherConstraintEngine(DEFAULT_CONSTRAINT_CONFIG);
  });

  describe('Read-only constraints', () => {
    test('should block CREATE operations', async () => {
      const cypher = 'CREATE (n:Person {name: "test"}) RETURN n';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.is_allowed).toBe(false);
      expect(analysis.violations).toHaveLength(1);
      expect(analysis.violations[0].code).toBe('READONLY_VIOLATION');
      expect(analysis.violations[0].severity).toBe('error');
    });

    test('should block MERGE operations', async () => {
      const cypher = 'MERGE (n:Person {name: "test"}) RETURN n';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.is_allowed).toBe(false);
      expect(analysis.violations.some(v => v.code === 'READONLY_VIOLATION')).toBe(true);
    });

    test('should block DELETE operations', async () => {
      const cypher = 'MATCH (n:Person) DELETE n';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.is_allowed).toBe(false);
      expect(analysis.violations.some(v => v.code === 'READONLY_VIOLATION')).toBe(true);
    });

    test('should block SET operations', async () => {
      const cypher = 'MATCH (n:Person) SET n.updated = timestamp() RETURN n';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.is_allowed).toBe(false);
      expect(analysis.violations.some(v => v.code === 'READONLY_VIOLATION')).toBe(true);
    });

    test('should allow READ operations', async () => {
      const cypher = 'MATCH (n:Person) RETURN n.name LIMIT 10';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.is_allowed).toBe(true);
      expect(analysis.violations.filter(v => v.severity === 'error')).toHaveLength(0);
    });

    test('should block dangerous APOC procedures', async () => {
      const cypher = 'CALL apoc.cypher.run("CREATE (n) RETURN n", {})';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.is_allowed).toBe(false);
      expect(analysis.violations.some(v => v.code === 'DANGEROUS_PROCEDURE')).toBe(true);
    });

    test('should allow safe procedures', async () => {
      const cypher = 'CALL db.labels() YIELD label RETURN label';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.is_allowed).toBe(true);
      expect(analysis.violations.filter(v => v.severity === 'error')).toHaveLength(0);
    });
  });

  describe('LIMIT constraints', () => {
    test('should auto-inject default LIMIT', async () => {
      const cypher = 'MATCH (n:Person) RETURN n.name';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.modified_cypher).toContain('LIMIT 100');
      expect(analysis.violations.some(v => v.code === 'LIMIT_INJECTED')).toBe(true);
    });

    test('should cap excessive LIMIT', async () => {
      const cypher = 'MATCH (n:Person) RETURN n.name LIMIT 50000';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.is_allowed).toBe(false);
      expect(analysis.violations.some(v => v.code === 'LIMIT_TOO_HIGH')).toBe(true);
      expect(analysis.modified_cypher).toContain('LIMIT 10000');
    });

    test('should allow reasonable LIMIT', async () => {
      const cypher = 'MATCH (n:Person) RETURN n.name LIMIT 500';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.is_allowed).toBe(true);
      expect(analysis.violations.filter(v => v.severity === 'error')).toHaveLength(0);
    });

    test('should warn about missing LIMIT when auto-inject disabled', async () => {
      const customEngine = new CypherConstraintEngine({
        ...DEFAULT_CONSTRAINT_CONFIG,
        limits: { ...DEFAULT_CONSTRAINT_CONFIG.limits, auto_inject: false }
      });

      const cypher = 'MATCH (n:Person) RETURN n.name';
      const analysis = await customEngine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.violations.some(v => v.code === 'MISSING_LIMIT')).toBe(true);
    });
  });

  describe('Complexity constraints', () => {
    test('should detect deep variable-length paths', async () => {
      const cypher = 'MATCH (a)-[*1..10]->(b) RETURN a, b LIMIT 10';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.violations.some(v => v.code === 'VAR_LENGTH_TOO_DEEP')).toBe(true);
      expect(analysis.complexity_score).toBeGreaterThan(5);
    });

    test('should detect potential Cartesian products', async () => {
      const cypher = 'MATCH (a:Person) MATCH (b:Company) RETURN a.name, b.name LIMIT 10';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.violations.some(v => v.code === 'POTENTIAL_CARTESIAN_PRODUCT')).toBe(true);
    });

    test('should detect high subquery complexity', async () => {
      const cypher = `
        MATCH (p:Person)
        WITH p WHERE exists((p)-[:WORKS_FOR]->())
        WITH p WHERE exists((p)-[:LIVES_IN]->())
        WITH p WHERE exists((p)-[:OWNS]->())
        RETURN p LIMIT 10
      `;
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.violations.some(v => v.code === 'HIGH_SUBQUERY_COMPLEXITY')).toBe(true);
    });

    test('should block queries exceeding cost budget', async () => {
      const cypher = 'MATCH (a)-[*1..8]->(b)-[*1..8]->(c) RETURN a, b, c LIMIT 10';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.violations.some(v => v.code === 'COST_BUDGET_EXCEEDED')).toBe(true);
      expect(analysis.is_allowed).toBe(false);
    });

    test('should allow simple queries', async () => {
      const cypher = 'MATCH (p:Person)-[:WORKS_FOR]->(c:Company) RETURN p.name, c.name LIMIT 10';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.complexity_score).toBeLessThan(3);
      expect(analysis.estimated_cost).toBeLessThan(0.1);
    });
  });

  describe('Pattern constraints', () => {
    test('should block forbidden patterns', async () => {
      const cypher = 'LOAD CSV FROM "file:///etc/passwd" AS line RETURN line';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.is_allowed).toBe(false);
      expect(analysis.violations.some(v => v.code === 'FORBIDDEN_PATTERN')).toBe(true);
    });

    test('should warn about performance patterns', async () => {
      const cypher = 'MATCH (a)-[*]->(b) RETURN a, b LIMIT 10';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant'
      });

      expect(analysis.violations.some(v => v.code === 'WARNING_PATTERN')).toBe(true);
    });
  });

  describe('Enforcement modes', () => {
    test('should block in block mode', async () => {
      const cypher = 'CREATE (n:Person) RETURN n';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant',
        enforcement_mode: 'block'
      });

      expect(analysis.is_allowed).toBe(false);
      expect(analysis.enforcement_mode).toBe('block');
    });

    test('should allow in allow mode', async () => {
      const cypher = 'CREATE (n:Person) RETURN n';
      const analysis = await engine.analyzeQuery(cypher, {
        user_id: 'test_user',
        tenant_id: 'test_tenant',
        enforcement_mode: 'allow'
      });

      expect(analysis.is_allowed).toBe(true);
      expect(analysis.enforcement_mode).toBe('allow');
    });
  });
});

describe('CypherExplainer', () => {
  let explainer: CypherExplainer;
  let engine: CypherConstraintEngine;

  beforeEach(() => {
    explainer = new CypherExplainer();
    engine = new CypherConstraintEngine();
  });

  test('should generate basic explanation', async () => {
    const cypher = 'CREATE (n:Person) RETURN n';
    const analysis = await engine.analyzeQuery(cypher, {
      user_id: 'test_user',
      tenant_id: 'test_tenant'
    });

    const explanation = explainer.explainAnalysis(analysis, {
      user_id: 'test_user',
      tenant_id: 'test_tenant',
      explain_level: 'basic',
      include_suggestions: true,
      include_auto_fixes: true
    });

    expect(explanation.summary).toContain('blocked');
    expect(explanation.decision).toBe('blocked');
    expect(explanation.reasons).toHaveLength(1);
    expect(explanation.reasons[0].category).toBe('readonly');
    expect(explanation.suggestions.length).toBeGreaterThan(0);
  });

  test('should generate detailed explanation', async () => {
    const cypher = 'MATCH (a)-[*1..10]->(b) RETURN a, b LIMIT 50000';
    const analysis = await engine.analyzeQuery(cypher, {
      user_id: 'test_user',
      tenant_id: 'test_tenant'
    });

    const explanation = explainer.explainAnalysis(analysis, {
      user_id: 'test_user',
      tenant_id: 'test_tenant',
      explain_level: 'detailed',
      include_suggestions: true,
      include_auto_fixes: true
    });

    expect(explanation.reasons.length).toBeGreaterThan(1);
    expect(explanation.suggestions.length).toBeGreaterThan(0);
    expect(explanation.confidence).toBeLessThan(1.0);
  });

  test('should generate technical explanation', async () => {
    const cypher = 'MATCH (n) WHERE n.score > 0.5 RETURN n LIMIT 1000';
    const analysis = await engine.analyzeQuery(cypher, {
      user_id: 'test_user',
      tenant_id: 'test_tenant'
    });

    const explanation = explainer.explainAnalysis(analysis, {
      user_id: 'test_user',
      tenant_id: 'test_tenant',
      explain_level: 'technical',
      include_suggestions: true,
      include_auto_fixes: false
    });

    if (explanation.reasons.length > 0) {
      expect(explanation.reasons[0].technicalDetails).toBeDefined();
      expect(explanation.reasons[0].learnMoreUrl).toBeDefined();
    }
    expect(explanation.autoFixes).toHaveLength(0);
  });

  test('should provide auto-fixes when available', async () => {
    const cypher = 'MATCH (n:Person) RETURN n LIMIT 50000';
    const analysis = await engine.analyzeQuery(cypher, {
      user_id: 'test_user',
      tenant_id: 'test_tenant'
    });

    const explanation = explainer.explainAnalysis(analysis, {
      user_id: 'test_user',
      tenant_id: 'test_tenant',
      explain_level: 'basic',
      include_suggestions: true,
      include_auto_fixes: true
    });

    expect(explanation.autoFixes.length).toBeGreaterThan(0);
    expect(explanation.autoFixes[0].fixedQuery).toContain('LIMIT 10000');
    expect(explanation.autoFixes[0].confidence).toBeGreaterThan(0.8);
  });
});

describe('NlToCypherGuardrails Integration', () => {
  let guardrails: NlToCypherGuardrails;

  beforeEach(() => {
    guardrails = new NlToCypherGuardrails();
  });

  test('should provide complete analysis with explanation', async () => {
    const cypher = 'MATCH (p:Person) RETURN p.name';
    const result = await guardrails.analyzeWithExplanation(cypher, {
      user_id: 'test_user',
      tenant_id: 'test_tenant',
      explain_level: 'detailed',
      include_suggestions: true,
      include_auto_fixes: true
    });

    expect(result.analysis).toBeDefined();
    expect(result.explanation).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.analysis.is_allowed).toBe(true);
  });

  test('should handle constraint violations with explanations', async () => {
    const cypher = 'CREATE (n:Person {name: "test"}) RETURN n';
    const result = await guardrails.analyzeWithExplanation(cypher, {
      user_id: 'test_user',
      tenant_id: 'test_tenant',
      enforcement_mode: 'block'
    });

    expect(result.analysis.is_allowed).toBe(false);
    expect(result.explanation.decision).toBe('blocked');
    expect(result.explanation.reasons.length).toBeGreaterThan(0);
  });

  test('should support quick constraint checks', async () => {
    const cypher = 'MATCH (n:Person) RETURN n.name LIMIT 10';
    const analysis = await guardrails.checkConstraints(cypher, {
      user_id: 'test_user',
      tenant_id: 'test_tenant'
    });

    expect(analysis.is_allowed).toBe(true);
    expect(analysis.violations.filter(v => v.severity === 'error')).toHaveLength(0);
  });
});

describe('Edge Cases and Error Handling', () => {
  let engine: CypherConstraintEngine;

  beforeEach(() => {
    engine = new CypherConstraintEngine();
  });

  test('should handle empty queries', async () => {
    const analysis = await engine.analyzeQuery('', {
      user_id: 'test_user',
      tenant_id: 'test_tenant'
    });

    expect(analysis.is_allowed).toBe(true);
    expect(analysis.violations).toHaveLength(0);
  });

  test('should handle malformed Cypher', async () => {
    const cypher = 'MATCH (n:Person RETURN n.name'; // Missing closing parenthesis
    const analysis = await engine.analyzeQuery(cypher, {
      user_id: 'test_user',
      tenant_id: 'test_tenant'
    });

    // Should still analyze what it can
    expect(analysis).toBeDefined();
    expect(analysis.query_id).toBeDefined();
  });

  test('should handle very long queries', async () => {
    const longCypher = 'MATCH (n:Person) WHERE ' +
      Array(1000).fill('n.name = "test"').join(' OR ') +
      ' RETURN n LIMIT 10';

    const analysis = await engine.analyzeQuery(longCypher, {
      user_id: 'test_user',
      tenant_id: 'test_tenant'
    });

    expect(analysis).toBeDefined();
    expect(analysis.complexity_score).toBeGreaterThan(1);
  });
});

describe('Performance Tests', () => {
  let engine: CypherConstraintEngine;

  beforeEach(() => {
    engine = new CypherConstraintEngine();
  });

  test('should analyze simple queries quickly', async () => {
    const cypher = 'MATCH (n:Person) RETURN n.name LIMIT 10';
    const start = Date.now();

    await engine.analyzeQuery(cypher, {
      user_id: 'test_user',
      tenant_id: 'test_tenant'
    });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // Should complete in <100ms
  });

  test('should handle batch analysis efficiently', async () => {
    const queries = [
      'MATCH (n:Person) RETURN n.name LIMIT 10',
      'MATCH (c:Company) RETURN c.name LIMIT 20',
      'MATCH (p:Person)-[:WORKS_FOR]->(c:Company) RETURN p.name, c.name LIMIT 5'
    ];

    const start = Date.now();

    const results = await Promise.all(
      queries.map(cypher =>
        engine.analyzeQuery(cypher, {
          user_id: 'test_user',
          tenant_id: 'test_tenant'
        })
      )
    );

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(300); // Batch should complete in <300ms
    expect(results).toHaveLength(3);
    results.forEach(result => expect(result.is_allowed).toBe(true));
  });
});