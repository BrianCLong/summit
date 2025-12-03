/**
 * Cypher Template Engine
 * Manages and executes parameterized Cypher query templates for threat hunting
 */

import { promises as fs } from 'fs';
import path from 'path';
import logger from '../config/logger.js';
import type {
  GeneratedCypherQuery,
  QueryValidationStatus,
  QueryExecutionResult,
  ThreatHypothesis,
} from './types.js';

interface CypherTemplate {
  name: string;
  description: string;
  category: TemplateCategory;
  query: string;
  parameters: TemplateParameter[];
  estimatedComplexity: number;
  ttps: string[];
}

interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: unknown;
  description: string;
  validation?: ParameterValidation;
}

interface ParameterValidation {
  min?: number;
  max?: number;
  pattern?: string;
  allowedValues?: unknown[];
}

type TemplateCategory =
  | 'lateral_movement'
  | 'credential_access'
  | 'data_exfiltration'
  | 'persistence'
  | 'command_and_control'
  | 'infrastructure'
  | 'supply_chain'
  | 'insider_threat'
  | 'ioc_hunting'
  | 'general';

const FORBIDDEN_CLAUSES = [
  'DELETE',
  'DETACH DELETE',
  'REMOVE',
  'SET',
  'CREATE',
  'MERGE',
  'DROP',
  'CALL.*yield.*DELETE',
];

const MAX_QUERY_COMPLEXITY = 100;
const MAX_RESULT_LIMIT = 10000;

export class CypherTemplateEngine {
  private templates: Map<string, CypherTemplate> = new Map();
  private templateCache: Map<string, string> = new Map();
  private readonly templatesPath: string;

  constructor(templatesPath?: string) {
    this.templatesPath =
      templatesPath ||
      path.join(process.cwd(), 'workflows/hunting/cypher-templates');
  }

  /**
   * Initialize the template engine by loading all templates
   */
  async initialize(): Promise<void> {
    try {
      await this.loadTemplates();
      logger.info('Cypher template engine initialized', {
        templateCount: this.templates.size,
        categories: this.getAvailableCategories(),
      });
    } catch (error) {
      logger.error('Failed to initialize Cypher template engine', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Load templates from the filesystem
   */
  private async loadTemplates(): Promise<void> {
    const files = await this.findTemplateFiles(this.templatesPath);

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const templates = this.parseTemplateFile(content, file);

        for (const template of templates) {
          this.templates.set(template.name, template);
        }
      } catch (error) {
        logger.warn('Failed to load template file', {
          file,
          error: (error as Error).message,
        });
      }
    }
  }

  /**
   * Find all .cypher template files
   */
  private async findTemplateFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.findTemplateFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.name.endsWith('.cypher')) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory might not exist
    }

    return files;
  }

  /**
   * Parse a template file and extract individual templates
   */
  private parseTemplateFile(content: string, filePath: string): CypherTemplate[] {
    const templates: CypherTemplate[] = [];
    const sections = content.split(/\/\/\s*Template:\s*/);

    for (const section of sections.slice(1)) {
      try {
        const template = this.parseTemplateSection(section, filePath);
        if (template) {
          templates.push(template);
        }
      } catch (error) {
        logger.warn('Failed to parse template section', {
          file: filePath,
          error: (error as Error).message,
        });
      }
    }

    return templates;
  }

  /**
   * Parse a single template section
   */
  private parseTemplateSection(section: string, filePath: string): CypherTemplate | null {
    const lines = section.trim().split('\n');
    if (lines.length < 2) return null;

    const name = lines[0].trim();
    const descriptionMatch = section.match(/\/\/\s*(.+?)(?:\n|$)/g);
    const description = descriptionMatch
      ? descriptionMatch
          .slice(1)
          .map((l) => l.replace(/\/\/\s*/, '').trim())
          .filter((l) => !l.startsWith('Parameters:'))
          .join(' ')
      : '';

    // Extract parameters from comments
    const paramMatch = section.match(/\/\/\s*Parameters:\s*(.+?)(?:\n|$)/);
    const parameters = this.parseParameterComment(paramMatch?.[1] || '');

    // Extract the query (everything after the comments)
    const queryStart = section.indexOf('MATCH');
    const query = queryStart >= 0 ? section.slice(queryStart).trim() : '';

    if (!query) return null;

    // Determine category from file path
    const category = this.inferCategory(filePath, name);

    // Extract TTPs from description
    const ttps = this.extractTTPs(description);

    return {
      name,
      description,
      category,
      query,
      parameters,
      estimatedComplexity: this.estimateComplexity(query),
      ttps,
    };
  }

  /**
   * Parse parameter comment string
   */
  private parseParameterComment(paramStr: string): TemplateParameter[] {
    const params: TemplateParameter[] = [];
    const paramMatches = paramStr.match(/\$(\w+)/g) || [];

    for (const match of paramMatches) {
      const name = match.slice(1);
      params.push({
        name,
        type: this.inferParameterType(name),
        required: true,
        description: `Parameter: ${name}`,
      });
    }

    return params;
  }

  /**
   * Infer parameter type from name
   */
  private inferParameterType(name: string): TemplateParameter['type'] {
    if (name.includes('list') || name.includes('ids') || name.includes('array')) {
      return 'array';
    }
    if (
      name.includes('count') ||
      name.includes('threshold') ||
      name.includes('hours') ||
      name.includes('days') ||
      name.includes('hops') ||
      name.includes('depth')
    ) {
      return 'number';
    }
    if (name.includes('enabled') || name.includes('flag')) {
      return 'boolean';
    }
    return 'string';
  }

  /**
   * Infer template category from file path and name
   */
  private inferCategory(filePath: string, name: string): TemplateCategory {
    const lowerPath = filePath.toLowerCase();
    const lowerName = name.toLowerCase();

    if (lowerPath.includes('ioc') || lowerName.includes('ioc')) return 'ioc_hunting';
    if (lowerName.includes('lateral') || lowerName.includes('movement')) return 'lateral_movement';
    if (lowerName.includes('credential') || lowerName.includes('privilege')) return 'credential_access';
    if (lowerName.includes('exfil') || lowerName.includes('staging')) return 'data_exfiltration';
    if (lowerName.includes('persistence') || lowerName.includes('backdoor')) return 'persistence';
    if (lowerName.includes('beacon') || lowerName.includes('c2')) return 'command_and_control';
    if (lowerName.includes('infrastructure') || lowerName.includes('diamond')) return 'infrastructure';
    if (lowerName.includes('supply') || lowerName.includes('vendor')) return 'supply_chain';
    if (lowerName.includes('insider') || lowerName.includes('user')) return 'insider_threat';

    return 'general';
  }

  /**
   * Extract MITRE ATT&CK TTPs from description
   */
  private extractTTPs(description: string): string[] {
    const ttpPattern = /T\d{4}(?:\.\d{3})?/g;
    return [...new Set(description.match(ttpPattern) || [])];
  }

  /**
   * Estimate query complexity
   */
  private estimateComplexity(query: string): number {
    let complexity = 0;

    // Count MATCH clauses
    complexity += (query.match(/MATCH/gi) || []).length * 10;

    // Count variable length paths
    complexity += (query.match(/\*\d*\.\./gi) || []).length * 20;

    // Count WHERE clauses
    complexity += (query.match(/WHERE/gi) || []).length * 5;

    // Count aggregations
    complexity += (query.match(/collect|count|sum|avg|min|max/gi) || []).length * 5;

    // Count UNWIND operations
    complexity += (query.match(/UNWIND/gi) || []).length * 15;

    // Count OPTIONAL MATCH
    complexity += (query.match(/OPTIONAL\s+MATCH/gi) || []).length * 15;

    return complexity;
  }

  /**
   * Generate Cypher query from hypothesis
   */
  async generateQueryFromHypothesis(
    hypothesis: ThreatHypothesis,
    params: Record<string, unknown> = {}
  ): Promise<GeneratedCypherQuery> {
    const templateName = hypothesis.requiredQueryTemplate;
    const template = this.templates.get(templateName);

    if (!template) {
      // Try to find a matching template by category or TTP
      const matchingTemplate = this.findMatchingTemplate(hypothesis);
      if (!matchingTemplate) {
        throw new Error(`Template not found: ${templateName}`);
      }
      return this.buildQuery(matchingTemplate, hypothesis.id, params);
    }

    return this.buildQuery(template, hypothesis.id, params);
  }

  /**
   * Find a matching template based on hypothesis characteristics
   */
  private findMatchingTemplate(hypothesis: ThreatHypothesis): CypherTemplate | null {
    // Try to match by TTP
    for (const ttp of hypothesis.mitreAttackTechniques) {
      for (const template of this.templates.values()) {
        if (template.ttps.includes(ttp.id)) {
          return template;
        }
      }
    }

    // Try to match by category based on hypothesis statement
    const statement = hypothesis.statement.toLowerCase();
    for (const template of this.templates.values()) {
      if (
        statement.includes(template.category.replace('_', ' ')) ||
        statement.includes(template.name.replace('_', ' '))
      ) {
        return template;
      }
    }

    return null;
  }

  /**
   * Build a query from template
   */
  private buildQuery(
    template: CypherTemplate,
    hypothesisId: string,
    params: Record<string, unknown>
  ): GeneratedCypherQuery {
    // Apply default values for missing parameters
    const fullParams: Record<string, unknown> = {};
    for (const param of template.parameters) {
      if (params[param.name] !== undefined) {
        fullParams[param.name] = params[param.name];
      } else if (param.defaultValue !== undefined) {
        fullParams[param.name] = param.defaultValue;
      } else if (param.required) {
        // Use sensible defaults based on type
        fullParams[param.name] = this.getDefaultForType(param.type, param.name);
      }
    }

    // Validate the query
    const validationStatus = this.validateQuery(template.query);

    return {
      id: `query-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      hypothesisId,
      query: template.query,
      params: fullParams,
      templateUsed: template.name,
      estimatedComplexity: template.estimatedComplexity,
      estimatedResultSize: this.estimateResultSize(template, fullParams),
      validationStatus,
      validationErrors: validationStatus.isValid
        ? []
        : this.getValidationErrors(template.query),
    };
  }

  /**
   * Get default value for parameter type
   */
  private getDefaultForType(type: TemplateParameter['type'], name: string): unknown {
    switch (type) {
      case 'number':
        if (name.includes('hours')) return 24;
        if (name.includes('days')) return 7;
        if (name.includes('threshold')) return 10;
        if (name.includes('hops') || name.includes('depth')) return 3;
        return 100;
      case 'boolean':
        return true;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return '';
    }
  }

  /**
   * Validate a Cypher query for safety
   */
  validateQuery(query: string): QueryValidationStatus {
    const upperQuery = query.toUpperCase();

    // Check for forbidden clauses
    const hasForbiddenClauses = FORBIDDEN_CLAUSES.some((clause) =>
      new RegExp(`\\b${clause}\\b`, 'i').test(query)
    );

    // Check for LIMIT clause
    const hasLimit = /\bLIMIT\s+\d+/i.test(query);

    // Calculate complexity
    const complexity = this.estimateComplexity(query);

    // Estimate cost (simplified)
    const estimatedCost = complexity * 10;

    return {
      isValid: !hasForbiddenClauses && complexity <= MAX_QUERY_COMPLEXITY,
      hasLimit,
      isReadOnly: !hasForbiddenClauses,
      complexity,
      estimatedCost,
    };
  }

  /**
   * Get validation errors for a query
   */
  private getValidationErrors(query: string): string[] {
    const errors: string[] = [];

    for (const clause of FORBIDDEN_CLAUSES) {
      if (new RegExp(`\\b${clause}\\b`, 'i').test(query)) {
        errors.push(`Forbidden clause detected: ${clause}`);
      }
    }

    const complexity = this.estimateComplexity(query);
    if (complexity > MAX_QUERY_COMPLEXITY) {
      errors.push(
        `Query complexity (${complexity}) exceeds maximum (${MAX_QUERY_COMPLEXITY})`
      );
    }

    if (!/\bLIMIT\s+\d+/i.test(query)) {
      errors.push('Query should include a LIMIT clause');
    }

    return errors;
  }

  /**
   * Estimate result size
   */
  private estimateResultSize(
    template: CypherTemplate,
    params: Record<string, unknown>
  ): number {
    // Extract LIMIT if present
    const limitMatch = template.query.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      return Math.min(parseInt(limitMatch[1], 10), MAX_RESULT_LIMIT);
    }

    // Use parameter hints if available
    if (typeof params.limit === 'number') {
      return Math.min(params.limit as number, MAX_RESULT_LIMIT);
    }

    return 100; // Default estimate
  }

  /**
   * Get template by name
   */
  getTemplate(name: string): CypherTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): CypherTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: TemplateCategory): CypherTemplate[] {
    return Array.from(this.templates.values()).filter(
      (t) => t.category === category
    );
  }

  /**
   * Get available categories
   */
  getAvailableCategories(): TemplateCategory[] {
    return [...new Set(Array.from(this.templates.values()).map((t) => t.category))];
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): CypherTemplate[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.ttps.some((ttp) => ttp.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Add LIMIT clause if missing
   */
  ensureLimit(query: string, limit: number = 100): string {
    if (/\bLIMIT\s+\d+/i.test(query)) {
      return query;
    }
    return `${query.trim()}\nLIMIT ${limit}`;
  }

  /**
   * Parameterize a raw query
   */
  parameterizeQuery(
    query: string,
    values: Record<string, unknown>
  ): { query: string; params: Record<string, unknown> } {
    let parameterizedQuery = query;
    const params: Record<string, unknown> = {};
    let paramIndex = 0;

    // Replace string literals with parameters
    for (const [key, value] of Object.entries(values)) {
      const paramName = `p${paramIndex++}`;
      const placeholder = new RegExp(`\\$${key}\\b`, 'g');
      parameterizedQuery = parameterizedQuery.replace(placeholder, `$${paramName}`);
      params[paramName] = value;
    }

    return { query: parameterizedQuery, params };
  }
}

export const cypherTemplateEngine = new CypherTemplateEngine();
