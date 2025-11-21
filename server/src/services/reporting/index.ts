/**
 * Reporting Service - Public API
 * Main entry point for the refactored reporting service
 */

// Main service
export { ReportingService } from './ReportingService.js';

// Core components
export { ReportTemplateRegistry } from './ReportTemplateRegistry.js';
export { ReportMetrics } from './ReportMetrics.js';
export { ReportRepository } from './repositories/ReportRepository.js';

// Exporters
export { ExporterFactory } from './exporters/ExporterFactory.js';
export { HTMLExporter } from './exporters/HTMLExporter.js';
export { PDFExporter } from './exporters/PDFExporter.js';
export { JSONExporter } from './exporters/JSONExporter.js';
export { CSVExporter } from './exporters/CSVExporter.js';
export { DOCXExporter } from './exporters/DOCXExporter.js';
export { ExcelExporter } from './exporters/ExcelExporter.js';
export { PowerPointExporter } from './exporters/PowerPointExporter.js';
export { GephiExporter } from './exporters/GephiExporter.js';
export type { IReportExporter } from './exporters/IReportExporter.js';
export { BaseReportExporter } from './exporters/IReportExporter.js';

// Generators
export { SectionGeneratorFactory } from './generators/SectionGeneratorFactory.js';
export {
  ExecutiveSummaryGenerator,
  KeyEntitiesGenerator,
  TimelineGenerator,
  NetworkOverviewGenerator,
} from './generators/SectionGeneratorFactory.js';

// Utilities
export { HTMLRenderer } from './utils/HTMLRenderer.js';

// Types
export * from './types/index.js';

// Validators
export { ReportRequestValidator, ValidationError } from './validators/ReportRequestValidator.js';
export { TemplateValidator } from './validators/TemplateValidator.js';
