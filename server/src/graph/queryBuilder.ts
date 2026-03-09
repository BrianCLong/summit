/**
 * CypherBuilder: A typed query builder for safe parameterized Cypher queries.
 * Prevents Cypher injection by automatically separating string templates and parameters.
 */
export class CypherBuilder {
  private queryParts: string[] = [];
  private parameters: Record<string, unknown> = {};
  private paramIndex = 0;

  constructor(initialParams?: Record<string, unknown>) {
    if (initialParams) {
      this.parameters = { ...initialParams };
    }
  }

  private generateParamName(prefix: string): string {
    return `${prefix}_${this.paramIndex++}`;
  }

  private addParam(value: unknown, prefix = 'p'): string {
    const name = this.generateParamName(prefix);
    this.parameters[name] = value;
    return `$${name}`;
  }

  match(pattern: string): this {
    this.queryParts.push(`MATCH ${pattern}`);
    return this;
  }

  optionalMatch(pattern: string): this {
    this.queryParts.push(`OPTIONAL MATCH ${pattern}`);
    return this;
  }

  where(condition: string, params?: Record<string, unknown>): this {
    if (params) {
      this.parameters = { ...this.parameters, ...params };
    }
    this.queryParts.push(`WHERE ${condition}`);
    return this;
  }

  whereEquals(identifier: string, property: string, value: unknown): this {
    const paramName = this.addParam(value, `${identifier}_${property}`);
    this.queryParts.push(`WHERE ${identifier}.${property} = ${paramName}`);
    return this;
  }

  merge(pattern: string): this {
    this.queryParts.push(`MERGE ${pattern}`);
    return this;
  }

  create(pattern: string): this {
    this.queryParts.push(`CREATE ${pattern}`);
    return this;
  }

  set(identifier: string, property: string, value: unknown): this {
    const paramName = this.addParam(value, `set_${identifier}_${property}`);
    this.queryParts.push(`SET ${identifier}.${property} = ${paramName}`);
    return this;
  }

  setProperties(identifier: string, properties: Record<string, unknown>): this {
    const paramName = this.addParam(properties, `set_props_${identifier}`);
    this.queryParts.push(`SET ${identifier} += ${paramName}`);
    return this;
  }

  onCreateSet(identifier: string, properties: Record<string, unknown>): this {
    const paramName = this.addParam(properties, `create_props_${identifier}`);
    this.queryParts.push(`ON CREATE SET ${identifier} += ${paramName}`);
    return this;
  }

  onMatchSet(identifier: string, properties: Record<string, unknown>): this {
    const paramName = this.addParam(properties, `match_props_${identifier}`);
    this.queryParts.push(`ON MATCH SET ${identifier} += ${paramName}`);
    return this;
  }

  with(clause: string): this {
    this.queryParts.push(`WITH ${clause}`);
    return this;
  }

  unwind(listParam: string, asIdentifier: string, listValue?: unknown[]): this {
    if (listValue !== undefined) {
      const p = this.addParam(listValue, listParam.replace('$', ''));
      this.queryParts.push(`UNWIND ${p} AS ${asIdentifier}`);
    } else {
      this.queryParts.push(`UNWIND ${listParam} AS ${asIdentifier}`);
    }
    return this;
  }

  return(clause: string): this {
    this.queryParts.push(`RETURN ${clause}`);
    return this;
  }

  orderBy(clause: string): this {
    this.queryParts.push(`ORDER BY ${clause}`);
    return this;
  }

  limit(limit: number): this {
    const paramName = this.addParam(limit, 'limit');
    this.queryParts.push(`LIMIT ${paramName}`);
    return this;
  }

  skip(skip: number): this {
    const paramName = this.addParam(skip, 'skip');
    this.queryParts.push(`SKIP ${paramName}`);
    return this;
  }

  raw(cypher: string, params?: Record<string, unknown>): this {
    if (params) {
      this.parameters = { ...this.parameters, ...params };
    }
    this.queryParts.push(cypher);
    return this;
  }

  build(): { query: string; params: Record<string, unknown> } {
    return {
      query: this.queryParts.join('\n'),
      params: this.parameters,
    };
  }
}
