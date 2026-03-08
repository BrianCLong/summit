"use strict";
/**
 * Report Exporter Interface
 * Defines the contract for all report export formats
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseReportExporter = void 0;
/**
 * Base class for report exporters with common functionality
 */
class BaseReportExporter {
    /**
     * Default implementation checks if report has required data
     */
    canExport(report) {
        return report.status === 'COMPLETED' && report.sections.length > 0;
    }
    /**
     * Generate a filename for the export
     */
    generateFilename(report) {
        const timestamp = new Date().toISOString().split('T')[0];
        return `report_${report.id}_${timestamp}.${this.extension}`;
    }
    /**
     * Get report title from template or use default
     */
    getReportTitle(report, template) {
        return template.name || 'Report';
    }
}
exports.BaseReportExporter = BaseReportExporter;
