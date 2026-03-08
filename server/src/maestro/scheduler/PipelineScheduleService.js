"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelineScheduleService = void 0;
const cron_1 = require("cron");
const pipelines_repo_js_1 = require("../pipelines/pipelines-repo.js");
const runs_repo_js_1 = require("../runs/runs-repo.js");
const Scheduler_js_1 = require("./Scheduler.js");
const logger_js_1 = require("../../config/logger.js");
const maestro_js_1 = require("../../realtime/maestro.js");
class PipelineScheduleService {
    jobs = new Map();
    stopSchedule(pipelineId) {
        const job = this.jobs.get(pipelineId);
        if (job) {
            job.stop();
            this.jobs.delete(pipelineId);
        }
    }
    async applySchedule(pipelineId, tenantId, schedule) {
        this.stopSchedule(pipelineId);
        if (!schedule.enabled || !schedule.cron) {
            return { nextRunAt: null };
        }
        const pipeline = await pipelines_repo_js_1.pipelinesRepo.get(pipelineId, tenantId);
        if (!pipeline) {
            throw new Error('Pipeline not found');
        }
        let job;
        try {
            job = new cron_1.CronJob(schedule.cron, async () => {
                try {
                    const run = await runs_repo_js_1.runsRepo.create({
                        pipeline_id: pipeline.id,
                        pipeline_name: pipeline.name,
                        tenant_id: tenantId,
                        input_params: {},
                    });
                    await Scheduler_js_1.scheduler.enqueueRun(run.id, tenantId);
                    const { getIO } = await Promise.resolve().then(() => __importStar(require('../../realtime/socket.js')));
                    const io = typeof getIO === 'function' ? getIO() : null;
                    if (io) {
                        maestro_js_1.MaestroEvents.emitStatusChange(io, tenantId, run.id, 'queued');
                    }
                }
                catch (error) {
                    logger_js_1.logger.error({ error, pipelineId, tenantId }, 'Failed to enqueue scheduled pipeline run');
                }
            }, null, true, schedule.timezone || 'UTC');
        }
        catch (error) {
            throw new Error('Invalid cron expression');
        }
        this.jobs.set(pipelineId, job);
        const next = job.nextDate();
        return { nextRunAt: next ? next.toISO() : null };
    }
}
exports.pipelineScheduleService = new PipelineScheduleService();
