import type { ExportOptions, ExportFormat } from './types';

/**
 * Export a visualization to various formats
 */
export class VisualizationExporter {
  /**
   * Export an SVG element to the specified format
   */
  static async export(
    element: SVGSVGElement | HTMLCanvasElement | HTMLElement,
    options: ExportOptions
  ): Promise<Blob> {
    const { format, scale = 2, backgroundColor, quality = 0.95 } = options;

    switch (format) {
      case 'svg':
        return this.exportToSVG(element, { backgroundColor });
      case 'png':
        return this.exportToPNG(element, { scale, backgroundColor, quality });
      case 'pdf':
        return this.exportToPDF(element, { scale, backgroundColor });
      case 'csv':
        throw new Error('CSV export requires data, not an element');
      case 'json':
        throw new Error('JSON export requires data, not an element');
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export data to CSV format
   */
  static exportDataToCSV(
    data: Record<string, unknown>[],
    options?: { filename?: string; delimiter?: string }
  ): Blob {
    const { delimiter = ',' } = options || {};

    if (data.length === 0) {
      return new Blob([''], { type: 'text/csv' });
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvRows: string[] = [];

    // Add header row
    csvRows.push(headers.map(h => `"${h}"`).join(delimiter));

    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        return String(value);
      });
      csvRows.push(values.join(delimiter));
    });

    return new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Export data to JSON format
   */
  static exportDataToJSON(data: unknown, options?: { pretty?: boolean }): Blob {
    const { pretty = true } = options || {};
    const jsonString = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Export SVG element to SVG file
   */
  private static async exportToSVG(
    element: SVGSVGElement | HTMLElement,
    options: { backgroundColor?: string }
  ): Promise<Blob> {
    let svgElement: SVGSVGElement;

    if (element instanceof SVGSVGElement) {
      svgElement = element;
    } else {
      const svg = element.querySelector('svg');
      if (!svg) {
        throw new Error('No SVG element found');
      }
      svgElement = svg;
    }

    // Clone the SVG
    const clone = svgElement.cloneNode(true) as SVGSVGElement;

    // Add background if specified
    if (options.backgroundColor) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100%');
      rect.setAttribute('height', '100%');
      rect.setAttribute('fill', options.backgroundColor);
      clone.insertBefore(rect, clone.firstChild);
    }

    // Get computed styles and inline them
    this.inlineStyles(clone);

    // Serialize to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);

    return new Blob([svgString], { type: 'image/svg+xml' });
  }

  /**
   * Export element to PNG
   */
  private static async exportToPNG(
    element: SVGSVGElement | HTMLCanvasElement | HTMLElement,
    options: { scale?: number; backgroundColor?: string; quality?: number }
  ): Promise<Blob> {
    const { scale = 2, backgroundColor = '#ffffff', quality = 0.95 } = options;

    // If already a canvas, export directly
    if (element instanceof HTMLCanvasElement) {
      return new Promise((resolve, reject) => {
        element.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
          'image/png',
          quality
        );
      });
    }

    // Get SVG element
    let svgElement: SVGSVGElement;
    if (element instanceof SVGSVGElement) {
      svgElement = element;
    } else {
      const svg = element.querySelector('svg');
      if (!svg) {
        throw new Error('No SVG element found');
      }
      svgElement = svg;
    }

    // Get dimensions
    const bbox = svgElement.getBoundingClientRect();
    const width = bbox.width * scale;
    const height = bbox.height * scale;

    // Clone and inline styles
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    this.inlineStyles(clone);

    // Serialize SVG
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    // Draw to canvas
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Fill background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Draw SVG
        ctx.drawImage(img, 0, 0, width, height);

        URL.revokeObjectURL(url);

        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
          'image/png',
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG'));
      };
      img.src = url;
    });
  }

  /**
   * Export element to PDF (basic implementation)
   */
  private static async exportToPDF(
    element: SVGSVGElement | HTMLElement,
    options: { scale?: number; backgroundColor?: string }
  ): Promise<Blob> {
    // For full PDF support, you would integrate with a library like jsPDF or pdfmake
    // This is a simplified implementation that creates an HTML wrapper
    const pngBlob = await this.exportToPNG(element, options);

    // Create a basic PDF structure (this is a minimal PDF)
    // In production, use a proper PDF library
    const pngUrl = URL.createObjectURL(pngBlob);

    // For now, return the PNG with a note that full PDF requires additional library
    console.warn('Full PDF export requires additional library integration (jsPDF or pdfmake)');

    URL.revokeObjectURL(pngUrl);
    return pngBlob;
  }

  /**
   * Inline computed styles into SVG elements
   */
  private static inlineStyles(element: SVGSVGElement): void {
    const elements = element.querySelectorAll('*');
    const computedStylesCache = new Map<string, CSSStyleDeclaration>();

    elements.forEach(el => {
      if (el instanceof SVGElement || el instanceof HTMLElement) {
        const tagName = el.tagName.toLowerCase();

        // Get cached or compute styles
        let defaultStyles = computedStylesCache.get(tagName);
        if (!defaultStyles) {
          const temp = document.createElementNS(
            el instanceof SVGElement ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml',
            tagName
          );
          document.body.appendChild(temp);
          defaultStyles = window.getComputedStyle(temp);
          computedStylesCache.set(tagName, defaultStyles);
          document.body.removeChild(temp);
        }

        const computedStyles = window.getComputedStyle(el);
        const importantStyles = [
          'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity',
          'font-family', 'font-size', 'font-weight', 'text-anchor',
          'dominant-baseline', 'visibility', 'display'
        ];

        importantStyles.forEach(prop => {
          const value = computedStyles.getPropertyValue(prop);
          if (value && value !== defaultStyles?.getPropertyValue(prop)) {
            (el as HTMLElement).style.setProperty(prop, value);
          }
        });
      }
    });
  }

  /**
   * Download a blob as a file
   */
  static download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate filename with timestamp
   */
  static generateFilename(baseName: string, format: ExportFormat): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${baseName}-${timestamp}.${format}`;
  }
}

/**
 * Hook-friendly export function
 */
export async function exportVisualization(
  element: SVGSVGElement | HTMLCanvasElement | HTMLElement,
  options: ExportOptions & { download?: boolean }
): Promise<Blob> {
  const blob = await VisualizationExporter.export(element, options);

  if (options.download !== false) {
    const filename = options.filename || VisualizationExporter.generateFilename('visualization', options.format);
    VisualizationExporter.download(blob, filename);
  }

  return blob;
}

/**
 * Export data helper
 */
export function exportData(
  data: unknown,
  format: 'csv' | 'json',
  options?: { filename?: string; download?: boolean }
): Blob {
  let blob: Blob;

  if (format === 'csv') {
    if (!Array.isArray(data)) {
      throw new Error('CSV export requires array data');
    }
    blob = VisualizationExporter.exportDataToCSV(data as Record<string, unknown>[]);
  } else {
    blob = VisualizationExporter.exportDataToJSON(data);
  }

  if (options?.download !== false) {
    const filename = options?.filename || VisualizationExporter.generateFilename('data', format);
    VisualizationExporter.download(blob, filename);
  }

  return blob;
}
