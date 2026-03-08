"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KpiReportGenerator = void 0;
const node_fs_1 = require("node:fs");
class KpiReportGenerator {
    generate(metrics, options) {
        const content = options.format === 'html' ? this.renderHtml(metrics, options) : this.renderJson(metrics, options);
        if (options.outputPath) {
            (0, node_fs_1.writeFileSync)(options.outputPath, content, 'utf8');
        }
        return { content, format: options.format };
    }
    renderHtml(metrics, options) {
        const rows = metrics
            .map((metric) => {
            const variance = metric.value - metric.target;
            const status = metric.value >= metric.target ? '✅' : '⚠️';
            return `<tr><td>${metric.name}</td><td>${metric.value}${metric.unit ?? ''}</td><td>${metric.target}${metric.unit ?? ''}</td><td>${variance}</td><td>${status}</td></tr>`;
        })
            .join('');
        const incidentTemplate = options.includeIncidentTemplate
            ? `<section><h2>Incident Postmortem Template</h2><ul><li>Customer impact</li><li>Detection</li><li>Root cause</li><li>Action items</li></ul></section>`
            : '';
        const sloBlock = options.sloObjectives
            ? `<section><h2>SLA/SLO Compliance</h2><ul>${options.sloObjectives
                .map((slo) => `<li>${slo.name}: ${slo.measured}${slo.unit ?? ''} / target ${slo.threshold}${slo.unit ?? ''}</li>`)
                .join('')}</ul></section>`
            : '';
        return `<!doctype html><html><head><meta charset="utf-8"><title>KPI Report</title></head><body><h1>Weekly KPI Report</h1><table><thead><tr><th>Name</th><th>Value</th><th>Target</th><th>Δ</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>${sloBlock}${incidentTemplate}</body></html>`;
    }
    renderJson(metrics, options) {
        const payload = {
            generatedAt: new Date().toISOString(),
            metrics: metrics.map((metric) => ({
                ...metric,
                variance: metric.value - metric.target,
                status: metric.value >= metric.target ? 'met' : 'at-risk',
            })),
            sloObjectives: options.sloObjectives ?? [],
            incidentTemplate: options.includeIncidentTemplate
                ? ['Customer impact', 'Detection', 'Root cause', 'Action items']
                : undefined,
        };
        return JSON.stringify(payload, null, 2);
    }
}
exports.KpiReportGenerator = KpiReportGenerator;
