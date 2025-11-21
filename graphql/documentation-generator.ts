/**
 * GraphQL Schema Documentation Generator
 * Auto-generates comprehensive documentation from schema
 */

import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLField,
  GraphQLArgument,
  GraphQLType,
  isObjectType,
  isInterfaceType,
  isInputObjectType,
  isEnumType,
  isScalarType,
  isListType,
  isNonNullType,
  GraphQLNamedType,
  printSchema,
} from 'graphql';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface DocumentationOptions {
  outputPath: string;
  format: 'markdown' | 'html' | 'json';
  includeDeprecated?: boolean;
  includeExamples?: boolean;
  groupByType?: boolean;
}

export interface TypeDocumentation {
  name: string;
  kind: string;
  description?: string;
  fields?: FieldDocumentation[];
  values?: EnumValueDocumentation[];
  deprecated?: boolean;
  deprecationReason?: string;
}

export interface FieldDocumentation {
  name: string;
  type: string;
  description?: string;
  arguments?: ArgumentDocumentation[];
  deprecated?: boolean;
  deprecationReason?: string;
  examples?: string[];
}

export interface ArgumentDocumentation {
  name: string;
  type: string;
  description?: string;
  defaultValue?: any;
  required: boolean;
}

export interface EnumValueDocumentation {
  name: string;
  description?: string;
  deprecated?: boolean;
  deprecationReason?: string;
}

export class DocumentationGenerator {
  private schema: GraphQLSchema;
  private examples: Map<string, string[]>;

  constructor(schema: GraphQLSchema, examples?: Map<string, string[]>) {
    this.schema = schema;
    this.examples = examples || new Map();
  }

  /**
   * Generate documentation
   */
  async generate(options: DocumentationOptions): Promise<void> {
    const documentation = this.extractDocumentation(options);

    switch (options.format) {
      case 'markdown':
        await this.generateMarkdown(documentation, options);
        break;
      case 'html':
        await this.generateHTML(documentation, options);
        break;
      case 'json':
        await this.generateJSON(documentation, options);
        break;
    }
  }

  /**
   * Extract documentation from schema
   */
  private extractDocumentation(
    options: DocumentationOptions
  ): TypeDocumentation[] {
    const typeMap = this.schema.getTypeMap();
    const documentation: TypeDocumentation[] = [];

    for (const [typeName, type] of Object.entries(typeMap)) {
      // Skip built-in types
      if (typeName.startsWith('__')) continue;

      // Skip deprecated types if not including them
      if (!options.includeDeprecated && this.isDeprecatedType(type)) {
        continue;
      }

      if (isObjectType(type)) {
        documentation.push(this.documentObjectType(type, options));
      } else if (isInterfaceType(type)) {
        documentation.push(this.documentInterfaceType(type, options));
      } else if (isInputObjectType(type)) {
        documentation.push(this.documentInputType(type, options));
      } else if (isEnumType(type)) {
        documentation.push(this.documentEnumType(type, options));
      } else if (isScalarType(type) && !this.isBuiltInScalar(typeName)) {
        documentation.push(this.documentScalarType(type));
      }
    }

    return documentation;
  }

  /**
   * Document object type
   */
  private documentObjectType(
    type: GraphQLObjectType,
    options: DocumentationOptions
  ): TypeDocumentation {
    const fields = type.getFields();
    const fieldDocs: FieldDocumentation[] = [];

    for (const [fieldName, field] of Object.entries(fields)) {
      if (!options.includeDeprecated && field.deprecationReason) {
        continue;
      }

      fieldDocs.push({
        name: fieldName,
        type: this.typeToString(field.type),
        description: field.description,
        arguments: field.args.map((arg) => this.documentArgument(arg)),
        deprecated: !!field.deprecationReason,
        deprecationReason: field.deprecationReason || undefined,
        examples: options.includeExamples
          ? this.examples.get(`${type.name}.${fieldName}`)
          : undefined,
      });
    }

    return {
      name: type.name,
      kind: 'Object',
      description: type.description || undefined,
      fields: fieldDocs,
    };
  }

  /**
   * Document interface type
   */
  private documentInterfaceType(
    type: GraphQLInterfaceType,
    options: DocumentationOptions
  ): TypeDocumentation {
    const fields = type.getFields();
    const fieldDocs: FieldDocumentation[] = [];

    for (const [fieldName, field] of Object.entries(fields)) {
      fieldDocs.push({
        name: fieldName,
        type: this.typeToString(field.type),
        description: field.description,
        arguments: field.args.map((arg) => this.documentArgument(arg)),
      });
    }

    return {
      name: type.name,
      kind: 'Interface',
      description: type.description || undefined,
      fields: fieldDocs,
    };
  }

  /**
   * Document input type
   */
  private documentInputType(
    type: GraphQLInputObjectType,
    options: DocumentationOptions
  ): TypeDocumentation {
    const fields = type.getFields();
    const fieldDocs: FieldDocumentation[] = [];

    for (const [fieldName, field] of Object.entries(fields)) {
      fieldDocs.push({
        name: fieldName,
        type: this.typeToString(field.type),
        description: field.description,
      });
    }

    return {
      name: type.name,
      kind: 'Input',
      description: type.description || undefined,
      fields: fieldDocs,
    };
  }

  /**
   * Document enum type
   */
  private documentEnumType(
    type: GraphQLEnumType,
    options: DocumentationOptions
  ): TypeDocumentation {
    const values = type.getValues();
    const valueDocs: EnumValueDocumentation[] = [];

    for (const value of values) {
      if (!options.includeDeprecated && value.deprecationReason) {
        continue;
      }

      valueDocs.push({
        name: value.name,
        description: value.description || undefined,
        deprecated: !!value.deprecationReason,
        deprecationReason: value.deprecationReason || undefined,
      });
    }

    return {
      name: type.name,
      kind: 'Enum',
      description: type.description || undefined,
      values: valueDocs,
    };
  }

  /**
   * Document scalar type
   */
  private documentScalarType(type: GraphQLNamedType): TypeDocumentation {
    return {
      name: type.name,
      kind: 'Scalar',
      description: type.description || undefined,
    };
  }

  /**
   * Document argument
   */
  private documentArgument(arg: GraphQLArgument): ArgumentDocumentation {
    return {
      name: arg.name,
      type: this.typeToString(arg.type),
      description: arg.description || undefined,
      defaultValue: arg.defaultValue,
      required: isNonNullType(arg.type),
    };
  }

  /**
   * Generate Markdown documentation
   */
  private async generateMarkdown(
    documentation: TypeDocumentation[],
    options: DocumentationOptions
  ): Promise<void> {
    let markdown = '# GraphQL API Documentation\n\n';
    markdown += `Generated: ${new Date().toISOString()}\n\n`;
    markdown += '## Table of Contents\n\n';

    // Group by kind
    const grouped = this.groupByKind(documentation);

    // Generate TOC
    for (const [kind, types] of Object.entries(grouped)) {
      markdown += `- [${kind}s](#${kind.toLowerCase()}s)\n`;
      for (const type of types) {
        markdown += `  - [${type.name}](#${type.name.toLowerCase()})\n`;
      }
    }
    markdown += '\n';

    // Generate sections
    for (const [kind, types] of Object.entries(grouped)) {
      markdown += `## ${kind}s\n\n`;

      for (const type of types) {
        markdown += this.typeToMarkdown(type);
      }
    }

    await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
    await fs.writeFile(options.outputPath, markdown);
  }

  /**
   * Convert type to markdown
   */
  private typeToMarkdown(type: TypeDocumentation): string {
    let md = `### ${type.name}\n\n`;

    if (type.description) {
      md += `${type.description}\n\n`;
    }

    if (type.deprecated) {
      md += `> **Deprecated:** ${type.deprecationReason}\n\n`;
    }

    // Fields
    if (type.fields && type.fields.length > 0) {
      md += '#### Fields\n\n';
      md += '| Field | Type | Description |\n';
      md += '|-------|------|-------------|\n';

      for (const field of type.fields) {
        const deprecated = field.deprecated ? ' ⚠️' : '';
        const desc = field.description || '';
        md += `| ${field.name}${deprecated} | \`${field.type}\` | ${desc} |\n`;
      }
      md += '\n';

      // Field details with arguments and examples
      for (const field of type.fields) {
        if (field.arguments && field.arguments.length > 0) {
          md += `##### ${field.name}\n\n`;

          if (field.description) {
            md += `${field.description}\n\n`;
          }

          md += '**Arguments:**\n\n';
          md += '| Name | Type | Required | Default | Description |\n';
          md += '|------|------|----------|---------|-------------|\n';

          for (const arg of field.arguments) {
            const required = arg.required ? 'Yes' : 'No';
            const defaultVal =
              arg.defaultValue !== undefined ? `\`${arg.defaultValue}\`` : '-';
            const desc = arg.description || '';
            md += `| ${arg.name} | \`${arg.type}\` | ${required} | ${defaultVal} | ${desc} |\n`;
          }
          md += '\n';
        }

        // Examples
        if (field.examples && field.examples.length > 0) {
          md += `**Examples:**\n\n`;
          for (const example of field.examples) {
            md += '```graphql\n';
            md += example;
            md += '\n```\n\n';
          }
        }
      }
    }

    // Enum values
    if (type.values && type.values.length > 0) {
      md += '#### Values\n\n';
      md += '| Value | Description |\n';
      md += '|-------|-------------|\n';

      for (const value of type.values) {
        const deprecated = value.deprecated ? ' ⚠️' : '';
        const desc = value.description || '';
        md += `| ${value.name}${deprecated} | ${desc} |\n`;
      }
      md += '\n';
    }

    return md;
  }

  /**
   * Generate HTML documentation
   */
  private async generateHTML(
    documentation: TypeDocumentation[],
    options: DocumentationOptions
  ): Promise<void> {
    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>GraphQL API Documentation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #333; }
    .type { border: 1px solid #ddd; border-radius: 4px; padding: 20px; margin: 20px 0; }
    .deprecated { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
    th { background-color: #f8f9fa; font-weight: 600; }
    code { background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: 'Monaco', monospace; }
    pre { background-color: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>GraphQL API Documentation</h1>
  <p>Generated: ${new Date().toISOString()}</p>
`;

    const grouped = this.groupByKind(documentation);

    for (const [kind, types] of Object.entries(grouped)) {
      html += `<h2>${kind}s</h2>\n`;

      for (const type of types) {
        html += this.typeToHTML(type);
      }
    }

    html += '</body></html>';

    await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
    await fs.writeFile(options.outputPath, html);
  }

  /**
   * Convert type to HTML
   */
  private typeToHTML(type: TypeDocumentation): string {
    let html = `<div class="type">`;
    html += `<h3>${type.name}</h3>`;

    if (type.description) {
      html += `<p>${type.description}</p>`;
    }

    if (type.deprecated) {
      html += `<div class="deprecated"><strong>Deprecated:</strong> ${type.deprecationReason}</div>`;
    }

    if (type.fields) {
      html += `<h4>Fields</h4>`;
      html += `<table><thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead><tbody>`;
      for (const field of type.fields) {
        html += `<tr><td><code>${field.name}</code></td><td><code>${field.type}</code></td><td>${field.description || ''}</td></tr>`;
      }
      html += `</tbody></table>`;
    }

    if (type.values) {
      html += `<h4>Values</h4>`;
      html += `<table><thead><tr><th>Value</th><th>Description</th></tr></thead><tbody>`;
      for (const value of type.values) {
        html += `<tr><td><code>${value.name}</code></td><td>${value.description || ''}</td></tr>`;
      }
      html += `</tbody></table>`;
    }

    html += `</div>\n`;
    return html;
  }

  /**
   * Generate JSON documentation
   */
  private async generateJSON(
    documentation: TypeDocumentation[],
    options: DocumentationOptions
  ): Promise<void> {
    const json = {
      generatedAt: new Date().toISOString(),
      types: documentation,
    };

    await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
    await fs.writeFile(options.outputPath, JSON.stringify(json, null, 2));
  }

  // Helper methods

  private typeToString(type: GraphQLType): string {
    if (isNonNullType(type)) {
      return `${this.typeToString(type.ofType)}!`;
    }
    if (isListType(type)) {
      return `[${this.typeToString(type.ofType)}]`;
    }
    return type.toString();
  }

  private groupByKind(
    documentation: TypeDocumentation[]
  ): Record<string, TypeDocumentation[]> {
    const grouped: Record<string, TypeDocumentation[]> = {};
    for (const type of documentation) {
      if (!grouped[type.kind]) {
        grouped[type.kind] = [];
      }
      grouped[type.kind].push(type);
    }
    return grouped;
  }

  private isDeprecatedType(type: GraphQLNamedType): boolean {
    // Check if type has deprecated directive
    return false; // Implement based on your schema
  }

  private isBuiltInScalar(name: string): boolean {
    return ['String', 'Int', 'Float', 'Boolean', 'ID'].includes(name);
  }
}

/**
 * Generate documentation from schema
 */
export async function generateDocumentation(
  schema: GraphQLSchema,
  options: DocumentationOptions
): Promise<void> {
  const generator = new DocumentationGenerator(schema);
  await generator.generate(options);
}
