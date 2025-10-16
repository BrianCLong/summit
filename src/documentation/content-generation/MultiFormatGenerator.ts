/**
 * Multi-Format Content Generation Pipeline
 *
 * Generates documentation in multiple formats from a single source:
 * - PDF with professional styling and branding
 * - EPUB for e-reader compatibility
 * - Interactive web documentation
 * - Print-ready formats
 * - Mobile-optimized versions
 */

import { promises as fs } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { marked } from 'marked';
import { JSDOM } from 'jsdom';

export interface ContentSource {
  type: 'markdown' | 'html' | 'docusaurus' | 'openapi';
  path: string;
  metadata: {
    title: string;
    author: string;
    version: string;
    description: string;
    keywords: string[];
    language: string;
  };
}

export interface GenerationConfig {
  outputDir: string;
  formats: ('pdf' | 'epub' | 'web' | 'print' | 'mobile')[];
  branding: {
    logo?: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    fonts: {
      heading: string;
      body: string;
      code: string;
    };
  };
  styling: {
    pageSize: 'A4' | 'Letter' | 'Legal';
    margins: { top: string; right: string; bottom: string; left: string };
    headerFooter: boolean;
    tableOfContents: boolean;
    indexGeneration: boolean;
  };
  optimization: {
    compression: boolean;
    imageOptimization: boolean;
    minification: boolean;
  };
}

export interface GenerationResult {
  success: boolean;
  formats: { [format: string]: string };
  errors: string[];
  warnings: string[];
  metrics: {
    totalPages: number;
    fileSize: { [format: string]: number };
    generationTime: number;
  };
}

export class MultiFormatGenerator {
  private config: GenerationConfig;
  private sources: ContentSource[] = [];
  private processedContent: Map<string, ProcessedContent> = new Map();

  constructor(config: GenerationConfig) {
    this.config = config;
  }

  /**
   * Add content source for processing
   */
  public addSource(source: ContentSource): void {
    this.sources.push(source);
  }

  /**
   * Generate all configured formats
   */
  public async generate(): Promise<GenerationResult> {
    const startTime = Date.now();
    const result: GenerationResult = {
      success: false,
      formats: {},
      errors: [],
      warnings: [],
      metrics: {
        totalPages: 0,
        fileSize: {},
        generationTime: 0,
      },
    };

    try {
      console.log('📚 Starting multi-format generation...');

      // Process all content sources
      await this.processContentSources();

      // Generate each requested format
      for (const format of this.config.formats) {
        try {
          const outputPath = await this.generateFormat(format);
          result.formats[format] = outputPath;

          // Calculate file size
          const stats = await fs.stat(outputPath);
          result.metrics.fileSize[format] = stats.size;

          console.log(`✅ Generated ${format.toUpperCase()}: ${outputPath}`);
        } catch (error) {
          result.errors.push(`Failed to generate ${format}: ${error.message}`);
          console.error(`❌ Failed to generate ${format}:`, error);
        }
      }

      result.metrics.generationTime = Date.now() - startTime;
      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(`Generation pipeline error: ${error.message}`);
      console.error('❌ Generation failed:', error);
    }

    return result;
  }

  /**
   * Process content sources into unified format
   */
  private async processContentSources(): Promise<void> {
    for (const source of this.sources) {
      const content = await this.loadContent(source);
      const processed = await this.processContent(content, source);
      this.processedContent.set(source.path, processed);
    }
  }

  /**
   * Load content from source
   */
  private async loadContent(source: ContentSource): Promise<string> {
    switch (source.type) {
      case 'markdown':
        return await fs.readFile(source.path, 'utf8');

      case 'html':
        return await fs.readFile(source.path, 'utf8');

      case 'docusaurus':
        return await this.loadDocusaurusContent(source.path);

      case 'openapi':
        return await this.loadOpenAPIContent(source.path);

      default:
        throw new Error(`Unsupported content type: ${source.type}`);
    }
  }

  /**
   * Load and process Docusaurus content
   */
  private async loadDocusaurusContent(basePath: string): Promise<string> {
    const docsDir = path.join(basePath, 'docs');
    const files = await this.getAllMarkdownFiles(docsDir);

    let combinedContent = '';
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      combinedContent += content + '\n\n';
    }

    return combinedContent;
  }

  /**
   * Load and process OpenAPI content
   */
  private async loadOpenAPIContent(specPath: string): Promise<string> {
    const yaml = await import('js-yaml');
    const content = await fs.readFile(specPath, 'utf8');
    const spec = yaml.load(content) as any;

    // Convert OpenAPI spec to markdown
    return this.convertOpenAPIToMarkdown(spec);
  }

  /**
   * Convert OpenAPI specification to markdown
   */
  private convertOpenAPIToMarkdown(spec: any): string {
    let markdown = `# ${spec.info.title}\n\n`;
    markdown += `${spec.info.description}\n\n`;
    markdown += `**Version:** ${spec.info.version}\n\n`;

    if (spec.paths) {
      markdown += '## Endpoints\n\n';

      for (const [path, pathItem] of Object.entries(spec.paths)) {
        if (!pathItem || typeof pathItem !== 'object') continue;

        for (const [method, operation] of Object.entries(pathItem)) {
          if (!operation || typeof operation !== 'object') continue;

          const op = operation as any;
          markdown += `### ${method.toUpperCase()} ${path}\n\n`;
          if (op.summary) markdown += `${op.summary}\n\n`;
          if (op.description) markdown += `${op.description}\n\n`;

          if (op.parameters) {
            markdown += '#### Parameters\n\n';
            for (const param of op.parameters) {
              markdown += `- **${param.name}** (${param.in}): ${param.description || 'No description'}\n`;
            }
            markdown += '\n';
          }
        }
      }
    }

    return markdown;
  }

  /**
   * Process content into unified structure
   */
  private async processContent(
    content: string,
    source: ContentSource,
  ): Promise<ProcessedContent> {
    let html: string;

    if (source.type === 'markdown') {
      html = marked(content);
    } else {
      html = content;
    }

    // Parse HTML to extract structure
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const sections = this.extractSections(document);
    const toc = this.generateTableOfContents(sections);

    return {
      html,
      sections,
      toc,
      metadata: source.metadata,
      wordCount: this.countWords(content),
      estimatedReadTime: Math.ceil(this.countWords(content) / 200), // 200 WPM average
    };
  }

  /**
   * Extract sections from document
   */
  private extractSections(document: Document): Section[] {
    const sections: Section[] = [];
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.substring(1));
      const title = heading.textContent || '';
      const id = heading.id || `section-${index}`;

      sections.push({
        level,
        title,
        id,
        content: this.getSectionContent(heading),
      });
    });

    return sections;
  }

  /**
   * Get content between this heading and the next
   */
  private getSectionContent(heading: Element): string {
    let content = '';
    let next = heading.nextElementSibling;

    while (next && !next.matches('h1, h2, h3, h4, h5, h6')) {
      content += next.outerHTML;
      next = next.nextElementSibling;
    }

    return content;
  }

  /**
   * Generate table of contents
   */
  private generateTableOfContents(sections: Section[]): TocEntry[] {
    return sections.map((section) => ({
      title: section.title,
      id: section.id,
      level: section.level,
      page: 1, // Will be updated during PDF generation
    }));
  }

  /**
   * Generate specific format
   */
  private async generateFormat(format: string): Promise<string> {
    switch (format) {
      case 'pdf':
        return await this.generatePDF();
      case 'epub':
        return await this.generateEPUB();
      case 'web':
        return await this.generateWeb();
      case 'print':
        return await this.generatePrint();
      case 'mobile':
        return await this.generateMobile();
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate PDF format
   */
  private async generatePDF(): Promise<string> {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Combine all processed content
    const combinedHtml = this.buildCombinedHTML('pdf');

    await page.setContent(combinedHtml, { waitUntil: 'networkidle0' });

    const outputPath = path.join(this.config.outputDir, 'documentation.pdf');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    await page.pdf({
      path: outputPath,
      format: this.config.styling.pageSize as any,
      margin: this.config.styling.margins,
      displayHeaderFooter: this.config.styling.headerFooter,
      headerTemplate: this.getHeaderTemplate(),
      footerTemplate: this.getFooterTemplate(),
      printBackground: true,
    });

    await browser.close();
    return outputPath;
  }

  /**
   * Generate EPUB format
   */
  private async generateEPUB(): Promise<string> {
    const outputPath = path.join(this.config.outputDir, 'documentation.epub');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Create EPUB structure
    const epubDir = path.join(this.config.outputDir, 'epub-temp');
    await this.createEPUBStructure(epubDir);

    // Package EPUB
    await this.packageEPUB(epubDir, outputPath);

    // Clean up temp directory
    await fs.rmdir(epubDir, { recursive: true });

    return outputPath;
  }

  /**
   * Generate web format
   */
  private async generateWeb(): Promise<string> {
    const outputDir = path.join(this.config.outputDir, 'web');
    await fs.mkdir(outputDir, { recursive: true });

    // Generate main HTML file
    const html = this.buildCombinedHTML('web');
    const htmlPath = path.join(outputDir, 'index.html');
    await fs.writeFile(htmlPath, html, 'utf8');

    // Generate CSS
    const css = this.generateCSS('web');
    const cssPath = path.join(outputDir, 'styles.css');
    await fs.writeFile(cssPath, css, 'utf8');

    // Copy assets
    await this.copyAssets(outputDir);

    return htmlPath;
  }

  /**
   * Generate print format
   */
  private async generatePrint(): Promise<string> {
    const outputDir = path.join(this.config.outputDir, 'print');
    await fs.mkdir(outputDir, { recursive: true });

    const html = this.buildCombinedHTML('print');
    const htmlPath = path.join(outputDir, 'print.html');
    await fs.writeFile(htmlPath, html, 'utf8');

    return htmlPath;
  }

  /**
   * Generate mobile format
   */
  private async generateMobile(): Promise<string> {
    const outputDir = path.join(this.config.outputDir, 'mobile');
    await fs.mkdir(outputDir, { recursive: true });

    const html = this.buildCombinedHTML('mobile');
    const htmlPath = path.join(outputDir, 'mobile.html');
    await fs.writeFile(htmlPath, html, 'utf8');

    return htmlPath;
  }

  /**
   * Build combined HTML for all content
   */
  private buildCombinedHTML(format: string): string {
    const metadata = this.sources[0]?.metadata || {
      title: 'Documentation',
      author: 'Unknown',
      version: '1.0.0',
      description: '',
      keywords: [],
      language: 'en',
    };

    let html = `
<!DOCTYPE html>
<html lang="${metadata.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.title}</title>
  <meta name="author" content="${metadata.author}">
  <meta name="description" content="${metadata.description}">
  <meta name="keywords" content="${metadata.keywords.join(', ')}">
  <style>${this.generateCSS(format)}</style>
</head>
<body>
  <div class="document">
    <header class="document-header">
      ${this.config.branding.logo ? `<img src="${this.config.branding.logo}" alt="Logo" class="logo">` : ''}
      <h1 class="document-title">${metadata.title}</h1>
      <p class="document-meta">Version ${metadata.version} | ${metadata.author}</p>
    </header>
    
    ${this.config.styling.tableOfContents ? this.generateTOCHTML() : ''}
    
    <main class="document-content">
    `;

    // Add all processed content
    for (const [sourcePath, content] of this.processedContent) {
      html += `<section class="content-section">${content.html}</section>`;
    }

    html += `
    </main>
    
    <footer class="document-footer">
      <p>Generated on ${new Date().toLocaleDateString()}</p>
    </footer>
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Generate CSS for specific format
   */
  private generateCSS(format: string): string {
    const { colors, fonts } = this.config.branding;

    let css = `
      :root {
        --primary-color: ${colors.primary};
        --secondary-color: ${colors.secondary};
        --accent-color: ${colors.accent};
        --font-heading: ${fonts.heading};
        --font-body: ${fonts.body};
        --font-code: ${fonts.code};
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: var(--font-body);
        line-height: 1.6;
        color: #333;
      }

      .document {
        max-width: 100%;
        margin: 0 auto;
      }

      .document-header {
        text-align: center;
        padding: 2rem;
        border-bottom: 2px solid var(--primary-color);
      }

      .logo {
        max-height: 100px;
        margin-bottom: 1rem;
      }

      .document-title {
        font-family: var(--font-heading);
        color: var(--primary-color);
        margin-bottom: 0.5rem;
      }

      h1, h2, h3, h4, h5, h6 {
        font-family: var(--font-heading);
        color: var(--primary-color);
        margin-top: 2rem;
        margin-bottom: 1rem;
      }

      code, pre {
        font-family: var(--font-code);
        background: #f5f5f5;
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
      }

      pre {
        padding: 1rem;
        overflow-x: auto;
      }

      .toc {
        background: #f9f9f9;
        padding: 2rem;
        margin: 2rem 0;
      }

      .toc h2 {
        margin-top: 0;
      }

      .toc ul {
        list-style: none;
        padding-left: 1rem;
      }

      .toc a {
        text-decoration: none;
        color: var(--primary-color);
      }
    `;

    // Format-specific styles
    switch (format) {
      case 'pdf':
        css += `
          body { font-size: 12pt; }
          .document { max-width: none; }
          @page { margin: ${this.config.styling.margins.top} ${this.config.styling.margins.right} ${this.config.styling.margins.bottom} ${this.config.styling.margins.left}; }
          .page-break { page-break-before: always; }
        `;
        break;

      case 'mobile':
        css += `
          .document { padding: 1rem; }
          .document-header { padding: 1rem; }
          h1 { font-size: 1.5rem; }
          h2 { font-size: 1.3rem; }
          pre { font-size: 0.8rem; }
        `;
        break;

      case 'print':
        css += `
          @media print {
            .no-print { display: none; }
            body { font-size: 11pt; }
            a { color: black; text-decoration: none; }
          }
        `;
        break;
    }

    return css;
  }

  // Helper methods
  private generateTOCHTML(): string {
    let tocHTML = '<nav class="toc"><h2>Table of Contents</h2><ul>';

    for (const [, content] of this.processedContent) {
      for (const entry of content.toc) {
        const indent = '  '.repeat(entry.level - 1);
        tocHTML += `${indent}<li><a href="#${entry.id}">${entry.title}</a></li>`;
      }
    }

    tocHTML += '</ul></nav>';
    return tocHTML;
  }

  private getHeaderTemplate(): string {
    return `
      <div style="font-size: 10px; padding: 5px; width: 100%; text-align: center;">
        <span class="title"></span>
      </div>
    `;
  }

  private getFooterTemplate(): string {
    return `
      <div style="font-size: 10px; padding: 5px; width: 100%; text-align: center;">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>
    `;
  }

  private async getAllMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.getAllMarkdownFiles(fullPath)));
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private async createEPUBStructure(epubDir: string): Promise<void> {
    // EPUB implementation would go here
    // This is a complex format requiring specific directory structure
    await fs.mkdir(epubDir, { recursive: true });
  }

  private async packageEPUB(
    epubDir: string,
    outputPath: string,
  ): Promise<void> {
    // EPUB packaging implementation would go here
  }

  private async copyAssets(outputDir: string): Promise<void> {
    // Copy any referenced assets like images, fonts, etc.
  }
}

// Supporting interfaces and types
interface ProcessedContent {
  html: string;
  sections: Section[];
  toc: TocEntry[];
  metadata: any;
  wordCount: number;
  estimatedReadTime: number;
}

interface Section {
  level: number;
  title: string;
  id: string;
  content: string;
}

interface TocEntry {
  title: string;
  id: string;
  level: number;
  page: number;
}
