"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportScheduler = void 0;
// @ts-nocheck
const node_cron_1 = __importDefault(require("node-cron"));
const validation_js_1 = require("./validation.js");
class ReportScheduler {
    reportingService;
    tasks = new Map();
    constructor(reportingService) {
        this.reportingService = reportingService;
    }
    schedule(job, access) {
        if (!node_cron_1.default.validate(job.cron)) {
            throw new Error(`Invalid cron expression for job ${job.id}`);
        }
        (0, validation_js_1.validateReportRequest)(job.request);
        if (this.tasks.has(job.id)) {
            this.tasks.get(job.id)?.stop();
            this.tasks.delete(job.id);
        }
        const task = node_cron_1.default.schedule(job.cron, () => {
            void this.reportingService.generate(job.request, access);
        }, { timezone: job.timezone });
        this.tasks.set(job.id, task);
    }
    cancel(jobId) {
        const task = this.tasks.get(jobId);
        if (task) {
            task.stop();
        }
        this.tasks.delete(jobId);
    }
    activeJobs() {
        return [...this.tasks.keys()];
    }
}
exports.ReportScheduler = ReportScheduler;
