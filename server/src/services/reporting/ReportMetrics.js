"use strict";
/**
 * Report Metrics Tracker
 * Tracks and manages reporting service metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportMetrics = void 0;
class ReportMetrics {
    metrics = {
        totalReports: 0,
        completedReports: 0,
        failedReports: 0,
        totalExports: 0,
        averageGenerationTime: 0,
        scheduledReportsActive: 0,
        dashboardViews: 0,
    };
    executionTimes = [];
    /**
     * Record a new report generation
     */
    recordReportGeneration() {
        this.metrics.totalReports++;
    }
    /**
     * Record a completed report
     */
    recordReportCompleted(executionTime) {
        this.metrics.completedReports++;
        this.recordExecutionTime(executionTime);
    }
    /**
     * Record a failed report
     */
    recordReportFailed() {
        this.metrics.failedReports++;
    }
    /**
     * Record an export
     */
    recordExport() {
        this.metrics.totalExports++;
    }
    /**
     * Record a dashboard view
     */
    recordDashboardView() {
        this.metrics.dashboardViews++;
    }
    /**
     * Update scheduled reports count
     */
    updateScheduledReportsCount(count) {
        this.metrics.scheduledReportsActive = count;
    }
    /**
     * Record execution time and update average
     */
    recordExecutionTime(time) {
        this.executionTimes.push(time);
        // Keep only last 100 execution times for rolling average
        if (this.executionTimes.length > 100) {
            this.executionTimes.shift();
        }
        // Calculate average
        const sum = this.executionTimes.reduce((acc, t) => acc + t, 0);
        this.metrics.averageGenerationTime = sum / this.executionTimes.length;
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        const successRate = this.metrics.totalReports > 0
            ? ((this.metrics.completedReports / this.metrics.totalReports) * 100).toFixed(2)
            : '0.00';
        return {
            ...this.metrics,
            successRate,
            activeReports: 0, // To be updated by ReportingService
        };
    }
    /**
     * Get usage analytics
     */
    getUsageAnalytics() {
        const successRate = this.metrics.totalReports > 0
            ? ((this.metrics.completedReports / this.metrics.totalReports) * 100).toFixed(2)
            : '0.00';
        return {
            successRate,
            averageGenerationTimeMinutes: (this.metrics.averageGenerationTime || 0) / 60000,
            popularTemplates: {}, // To be populated by ReportingService
        };
    }
    /**
     * Reset all metrics
     */
    reset() {
        this.metrics = {
            totalReports: 0,
            completedReports: 0,
            failedReports: 0,
            totalExports: 0,
            averageGenerationTime: 0,
            scheduledReportsActive: 0,
            dashboardViews: 0,
        };
        this.executionTimes = [];
    }
}
exports.ReportMetrics = ReportMetrics;
