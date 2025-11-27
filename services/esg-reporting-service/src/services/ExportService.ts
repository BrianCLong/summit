/**
 * ESG Export Service
 * Generates ESG reports in multiple formats (PDF, CSV, JSON)
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { createChildLogger } from '../utils/logger.js';
import {
  type ESGReport,
  type ESGMetricEntry,
  type ExportFormat,
  getAllFrameworks,
  getFramework,
} from '@intelgraph/esg-reporting';

export interface ExportOptions {
  formats: ExportFormat[];
  includeCharts?: boolean;
  includeRawData?: boolean;
  includeComplianceDetails?: boolean;
  watermark?: string;
}

export interface ExportResult {
  filename: string;
  format: ExportFormat;
  data: Buffer | string;
  mimeType: string;
}

export class ExportService {
  private log = createChildLogger({ service: 'ExportService' });

  /**
   * Export report in specified formats
   */
  async exportReport(
    report: ESGReport,
    metrics: ESGMetricEntry[],
    options: ExportOptions,
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = [];

    for (const format of options.formats) {
      try {
        let result: ExportResult;

        switch (format) {
          case 'pdf':
            result = await this.exportToPDF(report, metrics, options);
            break;
          case 'csv':
            result = await this.exportToCSV(report, metrics);
            break;
          case 'json':
            result = await this.exportToJSON(report, metrics);
            break;
          case 'excel':
            result = await this.exportToExcel(report, metrics);
            break;
          default:
            throw new Error(`Unsupported format: ${format}`);
        }

        results.push(result);
      } catch (error) {
        this.log.error({ error, format }, 'Export failed');
        throw error;
      }
    }

    return results;
  }

  /**
   * Export to ZIP archive with all formats
   */
  async exportToArchive(
    report: ESGReport,
    metrics: ESGMetricEntry[],
    options: ExportOptions,
  ): Promise<ExportResult> {
    const zip = new JSZip();
    const exports = await this.exportReport(report, metrics, options);

    for (const exp of exports) {
      const folderName = exp.format === 'pdf' ? 'reports' : 'data';
      zip.file(`${folderName}/${exp.filename}`, exp.data);
    }

    // Add manifest
    const manifest = {
      generatedAt: new Date().toISOString(),
      reportId: report.id,
      reportTitle: report.title,
      period: {
        start: report.periodStart,
        end: report.periodEnd,
      },
      formats: options.formats,
      files: exports.map((e) => ({
        path: `${e.format === 'pdf' ? 'reports' : 'data'}/${e.filename}`,
        format: e.format,
        mimeType: e.mimeType,
      })),
      chainOfCustody: [
        {
          event: 'export',
          timestamp: new Date().toISOString(),
          actor: report.metadata.generatedBy,
        },
      ],
    };

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    const content = await zip.generateAsync({ type: 'nodebuffer' });
    const filename = `esg-report-${report.id}-${Date.now()}.zip`;

    return {
      filename,
      format: 'json' as ExportFormat, // Archive type
      data: content,
      mimeType: 'application/zip',
    };
  }

  /**
   * Export to PDF format
   */
  private async exportToPDF(
    report: ESGReport,
    metrics: ESGMetricEntry[],
    options: ExportOptions,
  ): Promise<ExportResult> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Colors
    const primaryColor = rgb(0.1, 0.46, 0.82);
    const textColor = rgb(0.2, 0.2, 0.2);
    const successColor = rgb(0.13, 0.55, 0.13);
    const warningColor = rgb(0.85, 0.65, 0.13);
    const dangerColor = rgb(0.86, 0.21, 0.27);

    // Page dimensions
    const pageWidth = 595.28; // A4
    const pageHeight = 841.89;
    const margin = 50;

    // Helper function to add page
    const addPage = () => {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      return { page, y: pageHeight - margin };
    };

    // Title Page
    let { page, y } = addPage();

    // Title
    page.drawText('ESG REPORT', {
      x: margin,
      y: y - 50,
      size: 32,
      font: boldFont,
      color: primaryColor,
    });

    y -= 100;

    page.drawText(report.title, {
      x: margin,
      y,
      size: 24,
      font: boldFont,
      color: textColor,
    });

    y -= 40;

    // Period
    const periodText = `Reporting Period: ${new Date(report.periodStart).toLocaleDateString()} - ${new Date(report.periodEnd).toLocaleDateString()}`;
    page.drawText(periodText, {
      x: margin,
      y,
      size: 12,
      font: font,
      color: textColor,
    });

    y -= 60;

    // Overall Score
    page.drawText('Overall ESG Score', {
      x: margin,
      y,
      size: 16,
      font: boldFont,
      color: textColor,
    });

    y -= 30;

    const scoreColor =
      report.scores.overall >= 70
        ? successColor
        : report.scores.overall >= 50
          ? warningColor
          : dangerColor;

    page.drawText(`${report.scores.overall.toFixed(1)}`, {
      x: margin,
      y,
      size: 48,
      font: boldFont,
      color: scoreColor,
    });

    page.drawText(' / 100', {
      x: margin + 100,
      y: y + 10,
      size: 20,
      font: font,
      color: textColor,
    });

    y -= 80;

    // Category Scores
    const categories = [
      { name: 'Environmental', score: report.scores.environmental },
      { name: 'Social', score: report.scores.social },
      { name: 'Governance', score: report.scores.governance },
    ];

    for (const cat of categories) {
      const catColor =
        cat.score >= 70 ? successColor : cat.score >= 50 ? warningColor : dangerColor;

      page.drawText(cat.name, {
        x: margin,
        y,
        size: 14,
        font: font,
        color: textColor,
      });

      page.drawText(`${cat.score.toFixed(1)}`, {
        x: margin + 150,
        y,
        size: 14,
        font: boldFont,
        color: catColor,
      });

      y -= 25;
    }

    // Compliance Frameworks
    if (report.complianceFrameworks.length > 0) {
      y -= 30;
      page.drawText('Compliance Frameworks:', {
        x: margin,
        y,
        size: 14,
        font: boldFont,
        color: textColor,
      });

      y -= 20;
      for (const fwId of report.complianceFrameworks) {
        const fw = getFramework(fwId);
        if (fw) {
          page.drawText(`• ${fw.name}`, {
            x: margin + 10,
            y,
            size: 12,
            font: font,
            color: textColor,
          });
          y -= 18;
        }
      }
    }

    // Metrics Summary Page
    ({ page, y } = addPage());

    page.drawText('Metrics Summary', {
      x: margin,
      y: y - 20,
      size: 20,
      font: boldFont,
      color: primaryColor,
    });

    y -= 60;

    // Group metrics by category
    const metricsByCategory = metrics.reduce(
      (acc, m) => {
        if (!acc[m.category]) {
          acc[m.category] = [];
        }
        acc[m.category].push(m);
        return acc;
      },
      {} as Record<string, ESGMetricEntry[]>,
    );

    for (const [category, catMetrics] of Object.entries(metricsByCategory)) {
      if (y < 150) {
        ({ page, y } = addPage());
      }

      // Category header
      page.drawText(category.charAt(0).toUpperCase() + category.slice(1), {
        x: margin,
        y,
        size: 16,
        font: boldFont,
        color: primaryColor,
      });

      y -= 25;

      // Table header
      page.drawText('Metric', { x: margin, y, size: 10, font: boldFont, color: textColor });
      page.drawText('Value', { x: margin + 200, y, size: 10, font: boldFont, color: textColor });
      page.drawText('Target', { x: margin + 280, y, size: 10, font: boldFont, color: textColor });
      page.drawText('Trend', { x: margin + 360, y, size: 10, font: boldFont, color: textColor });

      y -= 5;
      page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });

      y -= 15;

      for (const metric of catMetrics) {
        if (y < 50) {
          ({ page, y } = addPage());
        }

        // Metric name (truncate if too long)
        const metricName =
          metric.name.length > 25 ? metric.name.substring(0, 25) + '...' : metric.name;
        page.drawText(metricName, {
          x: margin,
          y,
          size: 10,
          font: font,
          color: textColor,
        });

        // Value
        page.drawText(`${metric.value} ${metric.unit}`, {
          x: margin + 200,
          y,
          size: 10,
          font: font,
          color: textColor,
        });

        // Target
        if (metric.targetValue) {
          page.drawText(`${metric.targetValue}`, {
            x: margin + 280,
            y,
            size: 10,
            font: font,
            color: textColor,
          });
        }

        // Trend
        if (metric.trend) {
          const trendColor =
            metric.trend === 'improving'
              ? successColor
              : metric.trend === 'declining'
                ? dangerColor
                : textColor;
          const trendSymbol =
            metric.trend === 'improving' ? '↑' : metric.trend === 'declining' ? '↓' : '→';
          page.drawText(trendSymbol, {
            x: margin + 370,
            y,
            size: 12,
            font: font,
            color: trendColor,
          });
        }

        y -= 18;
      }

      y -= 20;
    }

    // Add watermark if specified
    if (options.watermark) {
      const pages = pdfDoc.getPages();
      for (const p of pages) {
        p.drawText(options.watermark, {
          x: pageWidth / 2 - 100,
          y: pageHeight / 2,
          size: 50,
          font: font,
          color: rgb(0.9, 0.9, 0.9),
          rotate: { angle: 45, type: 0 },
        });
      }
    }

    // Footer with generation info
    const pages = pdfDoc.getPages();
    const footerText = `Generated: ${new Date().toISOString()} | Report ID: ${report.id}`;
    for (let i = 0; i < pages.length; i++) {
      pages[i].drawText(footerText, {
        x: margin,
        y: 20,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
      pages[i].drawText(`Page ${i + 1} of ${pages.length}`, {
        x: pageWidth - margin - 50,
        y: 20,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    const pdfBytes = await pdfDoc.save();
    const filename = `esg-report-${report.id}-${Date.now()}.pdf`;

    this.log.info({ filename }, 'PDF export completed');

    return {
      filename,
      format: 'pdf',
      data: Buffer.from(pdfBytes),
      mimeType: 'application/pdf',
    };
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(
    report: ESGReport,
    metrics: ESGMetricEntry[],
  ): Promise<ExportResult> {
    const headers = [
      'Metric Name',
      'Category',
      'Subcategory',
      'Value',
      'Unit',
      'Previous Value',
      'Target Value',
      'Variance',
      'Trend',
      'Data Source',
      'Verification Status',
      'Notes',
    ];

    const rows = metrics.map((m) => [
      m.name,
      m.category,
      m.subcategory,
      m.value.toString(),
      m.unit,
      m.previousValue?.toString() || '',
      m.targetValue?.toString() || '',
      m.variance?.toString() || '',
      m.trend || '',
      m.dataSource.type,
      m.dataSource.verificationStatus,
      m.notes || '',
    ]);

    // Escape CSV fields
    const escapeCSV = (field: string): string => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const csvContent = [
      // Report metadata
      `# ESG Report: ${report.title}`,
      `# Period: ${new Date(report.periodStart).toISOString()} - ${new Date(report.periodEnd).toISOString()}`,
      `# Overall Score: ${report.scores.overall}`,
      `# Environmental Score: ${report.scores.environmental}`,
      `# Social Score: ${report.scores.social}`,
      `# Governance Score: ${report.scores.governance}`,
      '',
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    const filename = `esg-metrics-${report.id}-${Date.now()}.csv`;

    return {
      filename,
      format: 'csv',
      data: csvContent,
      mimeType: 'text/csv',
    };
  }

  /**
   * Export to JSON format
   */
  private async exportToJSON(
    report: ESGReport,
    metrics: ESGMetricEntry[],
  ): Promise<ExportResult> {
    const exportData = {
      report: {
        id: report.id,
        title: report.title,
        description: report.description,
        reportType: report.reportType,
        status: report.status,
        period: {
          start: report.periodStart,
          end: report.periodEnd,
        },
        scores: report.scores,
        complianceFrameworks: report.complianceFrameworks,
        metadata: report.metadata,
      },
      metrics: metrics.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        subcategory: m.subcategory,
        value: m.value,
        unit: m.unit,
        previousValue: m.previousValue,
        targetValue: m.targetValue,
        benchmarkValue: m.benchmarkValue,
        variance: m.variance,
        trend: m.trend,
        dataSource: m.dataSource,
        notes: m.notes,
      })),
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0',
      },
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const filename = `esg-report-${report.id}-${Date.now()}.json`;

    return {
      filename,
      format: 'json',
      data: jsonContent,
      mimeType: 'application/json',
    };
  }

  /**
   * Export to Excel format (as CSV with Excel compatibility)
   */
  private async exportToExcel(
    report: ESGReport,
    metrics: ESGMetricEntry[],
  ): Promise<ExportResult> {
    // For now, export as CSV with BOM for Excel compatibility
    const csvResult = await this.exportToCSV(report, metrics);

    // Add BOM for Excel UTF-8 compatibility
    const bom = '\ufeff';
    const excelContent = bom + csvResult.data;

    const filename = `esg-report-${report.id}-${Date.now()}.xlsx.csv`;

    return {
      filename,
      format: 'excel',
      data: excelContent,
      mimeType: 'text/csv;charset=utf-8',
    };
  }
}

export const exportService = new ExportService();
