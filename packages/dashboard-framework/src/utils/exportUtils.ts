import { Dashboard, ExportOptions } from '../types';

export async function exportDashboard(
  dashboard: Dashboard,
  options: ExportOptions
): Promise<Blob | string> {
  const { format, includeData = false, quality = 1, pageSize = 'a4', orientation = 'landscape' } = options;

  switch (format) {
    case 'json':
      return exportToJSON(dashboard, includeData);
    case 'png':
      return exportToPNG(dashboard, quality);
    case 'pdf':
      return exportToPDF(dashboard, pageSize, orientation);
    case 'pptx':
      return exportToPPTX(dashboard);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

function exportToJSON(dashboard: Dashboard, includeData: boolean): string {
  const exportData = {
    ...dashboard,
    exportedAt: new Date().toISOString(),
    version: dashboard.version,
  };

  if (!includeData) {
    exportData.pages = exportData.pages.map(page => ({
      ...page,
      widgets: page.widgets.map(widget => ({
        ...widget,
        config: {
          ...widget.config,
          data: undefined, // Remove actual data
        },
      })),
    }));
  }

  return JSON.stringify(exportData, null, 2);
}

async function exportToPNG(dashboard: Dashboard, quality: number): Promise<Blob> {
  // Implementation would capture the dashboard DOM and convert to PNG
  // For now, return a placeholder
  const canvas = document.createElement('canvas');
  canvas.width = 1920 * quality;
  canvas.height = 1080 * quality;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.font = `${24 * quality}px Inter, sans-serif`;
    ctx.fillText(`Dashboard: ${dashboard.name}`, 40 * quality, 60 * quality);
    ctx.font = `${16 * quality}px Inter, sans-serif`;
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`Pages: ${dashboard.pages.length}`, 40 * quality, 100 * quality);
    ctx.fillText(`Widgets: ${dashboard.pages.reduce((sum, p) => sum + p.widgets.length, 0)}`, 40 * quality, 130 * quality);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'image/png', quality);
  });
}

async function exportToPDF(
  dashboard: Dashboard,
  pageSize: string,
  orientation: string
): Promise<Blob> {
  // Implementation would use a library like jsPDF or html2pdf
  // For now, return placeholder text as blob
  const content = `
Dashboard Export: ${dashboard.name}
Created: ${new Date().toISOString()}
Pages: ${dashboard.pages.length}
Widgets: ${dashboard.pages.reduce((sum, p) => sum + p.widgets.length, 0)}

Page Size: ${pageSize}
Orientation: ${orientation}

---
${dashboard.pages.map(page => `
Page: ${page.name}
Widgets:
${page.widgets.map(w => `  - ${w.title} (${w.type})`).join('\n')}
`).join('\n')}
  `.trim();

  return new Blob([content], { type: 'application/pdf' });
}

async function exportToPPTX(dashboard: Dashboard): Promise<Blob> {
  // Implementation would use a library like pptxgenjs
  // For now, return placeholder
  const content = JSON.stringify({
    type: 'pptx-placeholder',
    dashboard: dashboard.name,
    slides: dashboard.pages.map(page => ({
      title: page.name,
      widgets: page.widgets.map(w => w.title),
    })),
  });

  return new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadJSON(data: any, filename: string): void {
  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export async function exportWidget(
  widgetElement: HTMLElement,
  format: 'png' | 'svg',
  scale: number = 2
): Promise<Blob> {
  if (format === 'svg') {
    const svgElement = widgetElement.querySelector('svg');
    if (svgElement) {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      return new Blob([svgString], { type: 'image/svg+xml' });
    }
  }

  // For PNG, use html2canvas or similar
  const canvas = document.createElement('canvas');
  const rect = widgetElement.getBoundingClientRect();
  canvas.width = rect.width * scale;
  canvas.height = rect.height * scale;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Would use html2canvas here for actual implementation
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'image/png');
  });
}
