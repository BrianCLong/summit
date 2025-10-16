/**
 * Advanced Documentation Pipeline
 *
 * Orchestrates the complete documentation generation process including:
 * - API discovery and documentation generation
 * - Content validation and quality checks
 * - Multi-format output generation
 * - Deployment and publishing automation
 */

import {
  OpenAPIGenerator,
  APIDocumentationConfig,
  APIEndpointDiscovery,
} from './OpenAPIGenerator.js';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export interface PipelineConfig {
  sourceDir: string;
  outputDir: string;
  apiConfig: APIDocumentationConfig;
  formats: ('openapi' | 'redoc' | 'swagger-ui' | 'postman')[];
  validation: {
    enabled: boolean;
    strictMode: boolean;
    customRules?: string[];
  };
  deployment: {
    enabled: boolean;
    target: 'github-pages' | 's3' | 'netlify' | 'custom';
    config?: Record<string, any>;
  };
}

export interface PipelineResult {
  success: boolean;
  generatedFiles: string[];
  validationErrors: string[];
  warnings: string[];
  metrics: {
    endpointsFound: number;
    schemasGenerated: number;
    processingTime: number;
  };
}

export class DocumentationPipeline {
  private config: PipelineConfig;
  private generator: OpenAPIGenerator;
  private discovery: APIEndpointDiscovery;

  constructor(config: PipelineConfig) {
    this.config = config;
    this.generator = new OpenAPIGenerator(config.apiConfig);
    this.discovery = new APIEndpointDiscovery(config.sourceDir);
  }

  /**
   * Execute the complete documentation pipeline
   */
  public async execute(): Promise<PipelineResult> {
    const startTime = Date.now();
    const result: PipelineResult = {
      success: false,
      generatedFiles: [],
      validationErrors: [],
      warnings: [],
      metrics: {
        endpointsFound: 0,
        schemasGenerated: 0,
        processingTime: 0,
      },
    };

    try {
      console.log('🚀 Starting documentation pipeline...');

      // Step 1: Discover API endpoints
      console.log('🔍 Discovering API endpoints...');
      const endpoints = await this.discovery.discoverEndpoints();
      result.metrics.endpointsFound = endpoints.length;

      if (endpoints.length === 0) {
        result.warnings.push('No API endpoints discovered');
      }

      // Step 2: Register endpoints with generator
      for (const endpoint of endpoints) {
        this.generator.registerEndpoint(endpoint);
      }

      // Step 3: Generate from GraphQL schema if available
      const graphqlSchemaPath = path.join(
        this.config.sourceDir,
        'graphql/schema.graphql',
      );
      try {
        await fs.access(graphqlSchemaPath);
        console.log('📊 Processing GraphQL schema...');
        await this.generator.generateFromGraphQL(graphqlSchemaPath);
      } catch {
        console.log('ℹ️ No GraphQL schema found, skipping...');
      }

      // Step 4: Validate specification
      if (this.config.validation.enabled) {
        console.log('✅ Validating API specification...');
        const validation = this.generator.validateSpec();
        if (!validation.valid) {
          result.validationErrors = validation.errors;
          if (this.config.validation.strictMode) {
            result.success = false;
            return result;
          }
        }
      }

      // Step 5: Generate output files
      console.log('📝 Generating documentation files...');
      await this.generateOutputFiles(result);

      // Step 6: Deploy if configured
      if (this.config.deployment.enabled) {
        console.log('🚀 Deploying documentation...');
        await this.deployDocumentation(result);
      }

      result.metrics.processingTime = Date.now() - startTime;
      result.success = true;
      console.log(
        `✅ Pipeline completed in ${result.metrics.processingTime}ms`,
      );
    } catch (error) {
      result.validationErrors.push(`Pipeline error: ${error.message}`);
      console.error('❌ Pipeline failed:', error);
    }

    return result;
  }

  /**
   * Generate output files in various formats
   */
  private async generateOutputFiles(result: PipelineResult): Promise<void> {
    await fs.mkdir(this.config.outputDir, { recursive: true });

    for (const format of this.config.formats) {
      switch (format) {
        case 'openapi':
          const openApiPath = path.join(this.config.outputDir, 'openapi.yaml');
          await this.generator.exportToFile(openApiPath, 'yaml');
          result.generatedFiles.push(openApiPath);
          break;

        case 'redoc':
          const redocPath = path.join(this.config.outputDir, 'redoc.html');
          const redocContent = this.generator.generateInteractiveDocs();
          await fs.writeFile(redocPath, redocContent, 'utf8');
          result.generatedFiles.push(redocPath);
          break;

        case 'swagger-ui':
          await this.generateSwaggerUI(result);
          break;

        case 'postman':
          await this.generatePostmanCollection(result);
          break;
      }
    }
  }

  /**
   * Generate Swagger UI documentation
   */
  private async generateSwaggerUI(result: PipelineResult): Promise<void> {
    const swaggerDir = path.join(this.config.outputDir, 'swagger-ui');
    await fs.mkdir(swaggerDir, { recursive: true });

    // Generate the OpenAPI spec
    const specPath = path.join(swaggerDir, 'openapi.json');
    await this.generator.exportToFile(specPath, 'json');

    // Generate Swagger UI HTML
    const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${this.config.apiConfig.title} - Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: './openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
    `;

    const htmlPath = path.join(swaggerDir, 'index.html');
    await fs.writeFile(htmlPath, swaggerHtml, 'utf8');
    result.generatedFiles.push(htmlPath, specPath);
  }

  /**
   * Generate Postman collection
   */
  private async generatePostmanCollection(
    result: PipelineResult,
  ): Promise<void> {
    const spec = this.generator.generateSpec();

    const postmanCollection = {
      info: {
        name: this.config.apiConfig.title,
        description: this.config.apiConfig.description,
        schema:
          'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      variable: [
        {
          key: 'baseUrl',
          value: this.config.apiConfig.baseUrl,
          type: 'string',
        },
      ],
      item: this.convertOpenAPIToPostman(spec),
    };

    const collectionPath = path.join(
      this.config.outputDir,
      'postman-collection.json',
    );
    await fs.writeFile(
      collectionPath,
      JSON.stringify(postmanCollection, null, 2),
      'utf8',
    );
    result.generatedFiles.push(collectionPath);
  }

  /**
   * Convert OpenAPI paths to Postman collection items
   */
  private convertOpenAPIToPostman(spec: any): any[] {
    const items: any[] = [];

    for (const [path, pathItem] of Object.entries(spec.paths || {})) {
      if (!pathItem || typeof pathItem !== 'object') continue;

      for (const [method, operation] of Object.entries(pathItem)) {
        if (!operation || typeof operation !== 'object') continue;

        const op = operation as any;
        const item = {
          name: op.summary || `${method.toUpperCase()} ${path}`,
          request: {
            method: method.toUpperCase(),
            header: [
              {
                key: 'Content-Type',
                value: 'application/json',
              },
            ],
            url: {
              raw: '{{baseUrl}}' + path,
              host: ['{{baseUrl}}'],
              path: path.split('/').filter((p) => p),
            },
            description: op.description,
          },
          response: [],
        };

        // Add request body if present
        if (op.requestBody) {
          const content = op.requestBody.content;
          if (content && content['application/json']) {
            item.request.body = {
              mode: 'raw',
              raw: JSON.stringify(
                content['application/json'].example || {},
                null,
                2,
              ),
              options: {
                raw: {
                  language: 'json',
                },
              },
            };
          }
        }

        items.push(item);
      }
    }

    return items;
  }

  /**
   * Deploy documentation to configured target
   */
  private async deployDocumentation(result: PipelineResult): Promise<void> {
    switch (this.config.deployment.target) {
      case 'github-pages':
        await this.deployToGitHubPages();
        break;
      case 's3':
        await this.deployToS3();
        break;
      case 'netlify':
        await this.deployToNetlify();
        break;
      default:
        result.warnings.push('Custom deployment target not implemented');
    }
  }

  private async deployToGitHubPages(): Promise<void> {
    // Implementation would use GitHub API or gh CLI
    console.log('📤 Deploying to GitHub Pages...');
  }

  private async deployToS3(): Promise<void> {
    // Implementation would use AWS SDK
    console.log('📤 Deploying to S3...');
  }

  private async deployToNetlify(): Promise<void> {
    // Implementation would use Netlify API
    console.log('📤 Deploying to Netlify...');
  }

  /**
   * Watch for changes and regenerate documentation
   */
  public async watch(): Promise<void> {
    const chokidar = await import('chokidar');

    const watcher = chokidar.watch(this.config.sourceDir, {
      ignored: /node_modules/,
      persistent: true,
    });

    console.log('👀 Watching for changes...');

    watcher.on('change', async (filePath) => {
      console.log(`📝 File changed: ${filePath}`);
      try {
        await this.execute();
        console.log('✅ Documentation updated');
      } catch (error) {
        console.error('❌ Failed to update documentation:', error);
      }
    });
  }
}
