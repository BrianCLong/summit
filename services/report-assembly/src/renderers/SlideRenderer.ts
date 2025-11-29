/**
 * SlideRenderer - Renders briefing packages to slide deck format
 */

import Handlebars from 'handlebars';
import type { RenderContext, RenderResult, SlideTemplate } from '../types.js';
import { defaultSlideTemplates } from '../templates/defaultTemplates.js';

export interface SlideContent {
  heading?: string;
  body?: string;
  bullets?: string[];
  imageUri?: string;
  leftContent?: string;
  rightContent?: string;
  chartData?: Record<string, unknown>;
  tableData?: string[][];
}

export interface Slide {
  id: string;
  order: number;
  title: string;
  layout: 'title' | 'content' | 'two_column' | 'bullets' | 'image' | 'chart';
  content: SlideContent;
  notes?: string;
}

export interface SlideRenderOptions {
  theme: 'professional' | 'modern' | 'minimal';
  aspectRatio: '16:9' | '4:3';
  includeNotes: boolean;
}

const defaultOptions: SlideRenderOptions = {
  theme: 'professional',
  aspectRatio: '16:9',
  includeNotes: false,
};

export class SlideRenderer {
  private readonly slideTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.loadSlideTemplates();
  }

  /**
   * Render slides to HTML presentation format
   */
  async render(
    slides: Slide[],
    context: RenderContext,
    options: Partial<SlideRenderOptions> = {},
  ): Promise<RenderResult> {
    const opts = { ...defaultOptions, ...options };

    const slidesHtml = slides
      .sort((a, b) => a.order - b.order)
      .map((slide) => this.renderSlide(slide, context, opts))
      .join('\n');

    const fullHtml = this.wrapInPresentation(slidesHtml, context, opts);

    const filename = this.generateFilename(context);

    return {
      content: fullHtml,
      format: 'html',
      mimeType: 'text/html',
      filename,
      metadata: {
        slideCount: slides.length,
        theme: opts.theme,
        aspectRatio: opts.aspectRatio,
        generatedAt: context.generatedAt,
      },
    };
  }

  /**
   * Generate slides from briefing data
   */
  generateSlidesFromBriefing(
    context: RenderContext,
    data: {
      executiveSummary?: string;
      keyFindings?: Array<{ summary: string; priority: string }>;
      narrativeSections?: Array<{ title: string; content: string }>;
      recommendations?: Array<{ title: string; description: string }>;
    },
  ): Slide[] {
    const slides: Slide[] = [];
    let order = 1;

    // Title slide
    slides.push({
      id: `slide-${order}`,
      order: order++,
      title: context.title,
      layout: 'title',
      content: {
        heading: context.title,
        body: `${context.briefingType.replace(/_/g, ' ').toUpperCase()}\n${new Date(context.generatedAt).toLocaleDateString()}`,
      },
    });

    // Executive summary slide
    if (data.executiveSummary) {
      slides.push({
        id: `slide-${order}`,
        order: order++,
        title: 'Executive Summary',
        layout: 'content',
        content: {
          heading: 'Executive Summary',
          body: this.truncateText(data.executiveSummary, 500),
        },
      });
    }

    // Key findings slide
    if (data.keyFindings && data.keyFindings.length > 0) {
      slides.push({
        id: `slide-${order}`,
        order: order++,
        title: 'Key Findings',
        layout: 'bullets',
        content: {
          heading: 'Key Findings',
          bullets: data.keyFindings.slice(0, 6).map((f) => f.summary),
        },
      });
    }

    // Section slides (limit to 5)
    if (data.narrativeSections) {
      for (const section of data.narrativeSections.slice(0, 5)) {
        slides.push({
          id: `slide-${order}`,
          order: order++,
          title: section.title,
          layout: 'content',
          content: {
            heading: section.title,
            body: this.truncateText(section.content, 400),
          },
        });
      }
    }

    // Recommendations slide
    if (data.recommendations && data.recommendations.length > 0) {
      slides.push({
        id: `slide-${order}`,
        order: order++,
        title: 'Recommendations',
        layout: 'bullets',
        content: {
          heading: 'Recommendations',
          bullets: data.recommendations.slice(0, 5).map((r) => `${r.title}: ${r.description}`),
        },
      });
    }

    // Closing slide
    slides.push({
      id: `slide-${order}`,
      order: order++,
      title: 'Questions',
      layout: 'title',
      content: {
        heading: 'Questions?',
        body: `Contact: ${context.generatedBy}\nClassification: ${context.classificationLevel}`,
      },
    });

    return slides;
  }

  /**
   * Render a single slide
   */
  private renderSlide(
    slide: Slide,
    context: RenderContext,
    options: SlideRenderOptions,
  ): string {
    const templateKey = `${slide.layout}-slide`;
    let template = this.slideTemplates.get(templateKey);

    if (!template) {
      // Fallback to content template
      template = this.slideTemplates.get('content-slide')!;
    }

    return template({
      ...slide.content,
      slideId: slide.id,
      slideTitle: slide.title,
      classificationLevel: context.classificationLevel,
      theme: options.theme,
    });
  }

  /**
   * Wrap slides in full presentation HTML
   */
  private wrapInPresentation(
    slidesHtml: string,
    context: RenderContext,
    options: SlideRenderOptions,
  ): string {
    const aspectRatio = options.aspectRatio === '16:9' ? '56.25%' : '75%';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${context.title} - Presentation</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
      color: #333;
    }

    .presentation {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .slide {
      position: relative;
      width: 100%;
      padding-top: ${aspectRatio};
      margin-bottom: 20px;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }

    .slide-content {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 40px 60px;
      display: flex;
      flex-direction: column;
    }

    .classification {
      position: absolute;
      top: 10px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 12px;
      font-weight: bold;
      padding: 4px;
      background: ${this.getClassificationColor(context.classificationLevel)};
      color: white;
    }

    .slide.title-slide .slide-content {
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      color: white;
    }

    .slide.title-slide h1 {
      font-size: 48px;
      margin-bottom: 20px;
    }

    .slide.title-slide .subtitle {
      font-size: 24px;
      opacity: 0.8;
      white-space: pre-line;
    }

    .slide.content-slide h2,
    .slide.bullets-slide h2 {
      font-size: 32px;
      color: #2c3e50;
      margin-top: 30px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #3498db;
    }

    .slide.content-slide .content {
      font-size: 20px;
      line-height: 1.6;
      flex: 1;
      overflow: auto;
    }

    .slide.bullets-slide ul {
      list-style: none;
      font-size: 22px;
      flex: 1;
    }

    .slide.bullets-slide li {
      padding: 12px 0;
      padding-left: 30px;
      position: relative;
    }

    .slide.bullets-slide li::before {
      content: '▸';
      position: absolute;
      left: 0;
      color: #3498db;
      font-weight: bold;
    }

    .slide.two-column-slide .columns {
      display: flex;
      gap: 40px;
      flex: 1;
    }

    .slide.two-column-slide .column {
      flex: 1;
      font-size: 18px;
    }

    ${this.getThemeStyles(options.theme)}

    @media print {
      .slide {
        page-break-after: always;
        box-shadow: none;
        border: 1px solid #ddd;
      }
    }
  </style>
</head>
<body>
  <div class="presentation">
    ${slidesHtml}
  </div>
  <script>
    // Simple keyboard navigation
    document.addEventListener('keydown', (e) => {
      const slides = document.querySelectorAll('.slide');
      let currentSlide = 0;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        currentSlide = Math.min(currentSlide + 1, slides.length - 1);
        slides[currentSlide].scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === 'ArrowLeft') {
        currentSlide = Math.max(currentSlide - 1, 0);
        slides[currentSlide].scrollIntoView({ behavior: 'smooth' });
      }
    });
  </script>
</body>
</html>`;
  }

  /**
   * Load slide templates
   */
  private loadSlideTemplates(): void {
    for (const template of defaultSlideTemplates) {
      this.slideTemplates.set(`${template.layout}-slide`, Handlebars.compile(template.template));
    }
  }

  /**
   * Get classification color
   */
  private getClassificationColor(level: string): string {
    const colors: Record<string, string> = {
      UNCLASSIFIED: '#4CAF50',
      CONFIDENTIAL: '#2196F3',
      SECRET: '#FF9800',
      TOP_SECRET: '#f44336',
      SCI: '#9C27B0',
    };
    return colors[level] || '#666';
  }

  /**
   * Get theme-specific styles
   */
  private getThemeStyles(theme: string): string {
    const themes: Record<string, string> = {
      professional: `
        .slide { font-family: 'Georgia', serif; }
        .slide h1, .slide h2 { font-family: 'Arial', sans-serif; }
      `,
      modern: `
        .slide { font-family: 'Helvetica Neue', sans-serif; }
        .slide.title-slide .slide-content {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
      `,
      minimal: `
        .slide { font-family: system-ui, sans-serif; }
        .slide.title-slide .slide-content {
          background: #fff;
          color: #333;
        }
        .slide h2 { border-bottom-color: #333; }
      `,
    };
    return themes[theme] || themes.professional;
  }

  /**
   * Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Generate filename
   */
  private generateFilename(context: RenderContext): string {
    const sanitizedTitle = context.title
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);

    const timestamp = new Date().toISOString().split('T')[0];

    return `${sanitizedTitle}_slides_${timestamp}.html`;
  }
}
