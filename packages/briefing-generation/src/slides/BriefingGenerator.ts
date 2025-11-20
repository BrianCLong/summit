/**
 * Intelligence briefing and slide deck generation
 */

import { v4 as uuidv4 } from 'uuid';

export interface Slide {
  id: string;
  type: 'TITLE' | 'CONTENT' | 'TWO_COLUMN' | 'CHART' | 'TABLE' | 'IMAGE' | 'TIMELINE' | 'NETWORK';
  title: string;
  content?: string;
  layout: SlideLayout;
  elements: SlideElement[];
  notes?: string;
  classification?: string;
  order: number;
}

export interface SlideLayout {
  name: string;
  columns: number;
  headerHeight?: number;
  footerHeight?: number;
  backgroundColor?: string;
  backgroundImage?: string;
}

export interface SlideElement {
  id: string;
  type: 'TEXT' | 'IMAGE' | 'CHART' | 'TABLE' | 'SHAPE' | 'ICON';
  position: { x: number; y: number; width: number; height: number };
  content?: any;
  style?: Record<string, any>;
}

export interface BriefingOptions {
  title: string;
  subtitle?: string;
  author: string;
  date: Date;
  classification?: string;
  theme: string;
  includeAgenda?: boolean;
  includeSummary?: boolean;
  includeQA?: boolean;
}

export class BriefingGenerator {
  private slides: Slide[] = [];

  /**
   * Create a new briefing
   */
  createBriefing(options: BriefingOptions): void {
    this.slides = [];

    // Add title slide
    this.addTitleSlide(options);

    // Add agenda if requested
    if (options.includeAgenda) {
      this.addAgendaSlide();
    }
  }

  /**
   * Add title slide
   */
  private addTitleSlide(options: BriefingOptions): void {
    this.slides.push({
      id: uuidv4(),
      type: 'TITLE',
      title: options.title,
      content: options.subtitle,
      layout: { name: 'title', columns: 1 },
      elements: [
        {
          id: uuidv4(),
          type: 'TEXT',
          position: { x: 0.5, y: 2, width: 9, height: 2 },
          content: options.title,
          style: { fontSize: 44, bold: true, align: 'center' }
        }
      ],
      notes: `Briefing prepared by ${options.author} on ${options.date.toISOString().split('T')[0]}`,
      classification: options.classification,
      order: 0
    });
  }

  /**
   * Add agenda slide
   */
  private addAgendaSlide(): void {
    this.slides.push({
      id: uuidv4(),
      type: 'CONTENT',
      title: 'Agenda',
      layout: { name: 'content', columns: 1 },
      elements: [],
      order: this.slides.length
    });
  }

  /**
   * Add content slide
   */
  addContentSlide(title: string, content: string, bullets?: string[]): Slide {
    const slide: Slide = {
      id: uuidv4(),
      type: 'CONTENT',
      title,
      content,
      layout: { name: 'content', columns: 1 },
      elements: [
        {
          id: uuidv4(),
          type: 'TEXT',
          position: { x: 0.5, y: 1.5, width: 9, height: 5 },
          content: bullets || content,
          style: { fontSize: 18 }
        }
      ],
      order: this.slides.length
    };

    this.slides.push(slide);
    return slide;
  }

  /**
   * Add chart slide
   */
  addChartSlide(title: string, chartData: any): Slide {
    const slide: Slide = {
      id: uuidv4(),
      type: 'CHART',
      title,
      layout: { name: 'chart', columns: 1 },
      elements: [
        {
          id: uuidv4(),
          type: 'CHART',
          position: { x: 1, y: 1.5, width: 8, height: 5 },
          content: chartData
        }
      ],
      order: this.slides.length
    };

    this.slides.push(slide);
    return slide;
  }

  /**
   * Add timeline slide
   */
  addTimelineSlide(title: string, events: Array<{ date: Date; event: string }>): Slide {
    const slide: Slide = {
      id: uuidv4(),
      type: 'TIMELINE',
      title,
      layout: { name: 'timeline', columns: 1 },
      elements: [
        {
          id: uuidv4(),
          type: 'SHAPE',
          position: { x: 0.5, y: 2, width: 9, height: 4 },
          content: events
        }
      ],
      order: this.slides.length
    };

    this.slides.push(slide);
    return slide;
  }

  /**
   * Add network diagram slide
   */
  addNetworkSlide(title: string, nodes: any[], edges: any[]): Slide {
    const slide: Slide = {
      id: uuidv4(),
      type: 'NETWORK',
      title,
      layout: { name: 'network', columns: 1 },
      elements: [
        {
          id: uuidv4(),
          type: 'SHAPE',
          position: { x: 0.5, y: 1.5, width: 9, height: 5 },
          content: { nodes, edges }
        }
      ],
      order: this.slides.length
    };

    this.slides.push(slide);
    return slide;
  }

  /**
   * Get all slides
   */
  getSlides(): Slide[] {
    return this.slides;
  }

  /**
   * Export briefing metadata
   */
  exportMetadata(): {
    totalSlides: number;
    types: Record<string, number>;
    hasClassification: boolean;
  } {
    const types: Record<string, number> = {};

    for (const slide of this.slides) {
      types[slide.type] = (types[slide.type] || 0) + 1;
    }

    return {
      totalSlides: this.slides.length,
      types,
      hasClassification: this.slides.some(s => s.classification)
    };
  }
}
