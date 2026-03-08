"use strict";
/**
 * Robotic Process Automation (RPA) Engine
 * Provides screen scraping, UI automation, file processing, and batch job scheduling
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPAEngine = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const node_cron_1 = __importDefault(require("node-cron"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class RPAEngine extends events_1.EventEmitter {
    maxConcurrent;
    tasks = new Map();
    executions = new Map();
    scheduledJobs = new Map();
    runningExecutions = new Set();
    constructor(maxConcurrent = 10) {
        super();
        this.maxConcurrent = maxConcurrent;
    }
    /**
     * Register an RPA task
     */
    registerTask(task) {
        const id = (0, uuid_1.v4)();
        const rpaTask = {
            ...task,
            id,
            createdAt: new Date(),
        };
        this.tasks.set(id, rpaTask);
        // Schedule task if cron expression is provided
        if (task.schedule && task.enabled) {
            this.scheduleTask(rpaTask);
        }
        this.emit('task.registered', rpaTask);
        return rpaTask;
    }
    /**
     * Schedule a task with cron
     */
    scheduleTask(task) {
        if (!task.schedule) {
            return;
        }
        // Stop existing schedule if any
        const existingJob = this.scheduledJobs.get(task.id);
        if (existingJob) {
            existingJob.stop();
        }
        try {
            const job = node_cron_1.default.schedule(task.schedule, async () => {
                await this.executeTask(task.id);
            });
            this.scheduledJobs.set(task.id, job);
            this.emit('task.scheduled', task);
        }
        catch (error) {
            this.emit('task.schedule.error', { task, error: error.message });
        }
    }
    /**
     * Execute an RPA task
     */
    async executeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error('Task not found');
        }
        if (!task.enabled) {
            throw new Error('Task is disabled');
        }
        // Check concurrency limit
        if (this.runningExecutions.size >= this.maxConcurrent) {
            throw new Error('Maximum concurrent executions reached');
        }
        const executionId = (0, uuid_1.v4)();
        const execution = {
            id: executionId,
            taskId: task.id,
            status: 'running',
            startedAt: new Date(),
            retryCount: 0,
        };
        this.executions.set(executionId, execution);
        this.runningExecutions.add(executionId);
        task.lastExecuted = new Date();
        this.emit('task.execution.started', execution);
        try {
            let result;
            switch (task.type) {
                case 'web_scraping':
                    result = await this.executeWebScraping(task.config);
                    break;
                case 'api_call':
                    result = await this.executeAPICall(task.config);
                    break;
                case 'file_processing':
                    result = await this.executeFileProcessing(task.config);
                    break;
                case 'email':
                    result = await this.executeEmailTask(task.config);
                    break;
                case 'data_transformation':
                    result = await this.executeDataTransformation(task.config);
                    break;
                case 'batch_job':
                    result = await this.executeBatchJob(task.config);
                    break;
                default:
                    throw new Error(`Unsupported task type: ${task.type}`);
            }
            execution.status = 'completed';
            execution.completedAt = new Date();
            execution.result = result;
            execution.duration =
                execution.completedAt.getTime() - execution.startedAt.getTime();
            this.emit('task.execution.completed', execution);
            return execution;
        }
        catch (error) {
            execution.status = 'failed';
            execution.completedAt = new Date();
            execution.error = {
                message: error.message,
                stack: error.stack,
            };
            execution.duration =
                execution.completedAt.getTime() - execution.startedAt.getTime();
            // Handle retries
            if (task.retryConfig &&
                execution.retryCount < task.retryConfig.maxRetries) {
                execution.retryCount++;
                const delay = task.retryConfig.exponentialBackoff
                    ? task.retryConfig.retryDelay * Math.pow(2, execution.retryCount - 1)
                    : task.retryConfig.retryDelay;
                setTimeout(() => {
                    this.executeTask(taskId).catch((err) => this.emit('task.retry.failed', { task, error: err.message }));
                }, delay);
                this.emit('task.execution.retrying', { execution, delay });
            }
            else {
                this.emit('task.execution.failed', execution);
            }
            throw error;
        }
        finally {
            this.runningExecutions.delete(executionId);
        }
    }
    /**
     * Execute web scraping task
     */
    async executeWebScraping(config) {
        if (!config.url) {
            throw new Error('URL is required for web scraping');
        }
        const startTime = Date.now();
        try {
            const response = await axios_1.default.get(config.url, {
                headers: config.headers,
                timeout: 30000,
            });
            const $ = cheerio.load(response.data);
            const data = {};
            if (config.selectors) {
                Object.entries(config.selectors).forEach(([key, selector]) => {
                    const elements = $(selector);
                    if (elements.length === 1) {
                        data[key] = elements.text().trim();
                    }
                    else {
                        data[key] = elements
                            .map((_, el) => $(el).text().trim())
                            .get();
                    }
                });
            }
            else {
                // Return raw HTML if no selectors specified
                data.html = response.data;
            }
            const responseTime = Date.now() - startTime;
            return {
                url: config.url,
                timestamp: new Date(),
                data,
                metadata: {
                    responseTime,
                    statusCode: response.status,
                    contentLength: response.data.length,
                },
            };
        }
        catch (error) {
            throw new Error(`Web scraping failed: ${error.message}`);
        }
    }
    /**
     * Execute API call task
     */
    async executeAPICall(config) {
        if (!config.url) {
            throw new Error('URL is required for API call');
        }
        const requestConfig = {
            method: config.method || 'GET',
            url: config.url,
            headers: config.headers,
            params: config.queryParams,
            data: config.body,
            timeout: 30000,
        };
        try {
            const response = await (0, axios_1.default)(requestConfig);
            return {
                status: response.status,
                headers: response.headers,
                data: response.data,
            };
        }
        catch (error) {
            throw new Error(`API call failed: ${error.response?.status || error.message}`);
        }
    }
    /**
     * Execute file processing task
     */
    async executeFileProcessing(config) {
        if (!config.inputPath) {
            throw new Error('Input path is required for file processing');
        }
        try {
            switch (config.operation) {
                case 'read':
                    return await this.readFile(config.inputPath);
                case 'write':
                    if (!config.outputPath) {
                        throw new Error('Output path required for write operation');
                    }
                    return await this.writeFile(config.outputPath, config.customConfig?.content);
                case 'copy':
                    if (!config.outputPath) {
                        throw new Error('Output path required for copy operation');
                    }
                    return await this.copyFile(config.inputPath, config.outputPath);
                case 'move':
                    if (!config.outputPath) {
                        throw new Error('Output path required for move operation');
                    }
                    return await this.moveFile(config.inputPath, config.outputPath);
                case 'delete':
                    return await this.deleteFile(config.inputPath);
                case 'transform':
                    return await this.transformFile(config);
                case 'archive':
                    if (!config.outputPath) {
                        throw new Error('Output path required for archive operation');
                    }
                    return await this.archiveFiles(config.inputPath, config.outputPath);
                default:
                    throw new Error(`Unsupported file operation: ${config.operation}`);
            }
        }
        catch (error) {
            throw new Error(`File processing failed: ${error.message}`);
        }
    }
    /**
     * Execute email task
     */
    async executeEmailTask(config) {
        if (!config.to || config.to.length === 0) {
            throw new Error('Recipients are required for email task');
        }
        // Email sending implementation would go here
        // Using nodemailer or similar
        this.emit('email.sent', {
            to: config.to,
            subject: config.subject,
            timestamp: new Date(),
        });
        return {
            sent: true,
            recipients: config.to.length,
            timestamp: new Date(),
        };
    }
    /**
     * Execute data transformation task
     */
    async executeDataTransformation(config) {
        if (!config.transformations || config.transformations.length === 0) {
            throw new Error('Transformations are required');
        }
        let data = config.customConfig?.inputData;
        if (!data) {
            throw new Error('Input data is required for transformation');
        }
        for (const transformation of config.transformations) {
            data = await this.applyTransformation(data, transformation);
        }
        return data;
    }
    /**
     * Apply a data transformation
     */
    async applyTransformation(data, transformation) {
        if (!Array.isArray(data)) {
            data = [data];
        }
        switch (transformation.type) {
            case 'map':
                return data.map((item) => transformation.customTransform
                    ? transformation.customTransform(item)
                    : item);
            case 'filter':
                return data.filter((item) => transformation.customTransform
                    ? transformation.customTransform(item)
                    : true);
            case 'reduce':
                return data.reduce((acc, item) => transformation.customTransform
                    ? transformation.customTransform({ acc, item })
                    : acc, transformation.value || {});
            case 'aggregate':
                // Simple aggregation
                return {
                    count: data.length,
                    sum: transformation.field &&
                        data.reduce((sum, item) => sum + (item[transformation.field] || 0), 0),
                };
            case 'normalize':
                // Flatten nested structures
                return data.map((item) => this.flattenObject(item));
            case 'custom':
                return transformation.customTransform
                    ? transformation.customTransform(data)
                    : data;
            default:
                return data;
        }
    }
    /**
     * Execute batch job
     */
    async executeBatchJob(config) {
        // Batch job execution logic
        const jobs = config.customConfig?.jobs || [];
        const results = [];
        for (const job of jobs) {
            try {
                const result = await this.executeTask(job.taskId);
                results.push({ job: job.taskId, status: 'success', result });
            }
            catch (error) {
                results.push({
                    job: job.taskId,
                    status: 'failed',
                    error: error.message,
                });
            }
        }
        return {
            totalJobs: jobs.length,
            successful: results.filter((r) => r.status === 'success').length,
            failed: results.filter((r) => r.status === 'failed').length,
            results,
        };
    }
    // File operation helpers
    async readFile(filePath) {
        return await promises_1.default.readFile(filePath, 'utf-8');
    }
    async writeFile(filePath, content) {
        const dir = path_1.default.dirname(filePath);
        await promises_1.default.mkdir(dir, { recursive: true });
        await promises_1.default.writeFile(filePath, content, 'utf-8');
    }
    async copyFile(source, destination) {
        const dir = path_1.default.dirname(destination);
        await promises_1.default.mkdir(dir, { recursive: true });
        await promises_1.default.copyFile(source, destination);
    }
    async moveFile(source, destination) {
        await this.copyFile(source, destination);
        await promises_1.default.unlink(source);
    }
    async deleteFile(filePath) {
        await promises_1.default.unlink(filePath);
    }
    async transformFile(config) {
        const content = await this.readFile(config.inputPath);
        // Apply transformations
        let transformed = content;
        if (config.transformations) {
            // Parse content as JSON if possible
            try {
                let data = JSON.parse(content);
                for (const transformation of config.transformations) {
                    data = await this.applyTransformation(data, transformation);
                }
                transformed = JSON.stringify(data, null, 2);
            }
            catch {
                // Content is not JSON, apply string transformations
                transformed = content;
            }
        }
        if (config.outputPath) {
            await this.writeFile(config.outputPath, transformed);
        }
        return transformed;
    }
    async archiveFiles(sourcePath, archivePath) {
        // Archive implementation would use a library like archiver
        // For now, just copy
        await this.copyFile(sourcePath, archivePath);
        return { archived: true, path: archivePath };
    }
    flattenObject(obj, prefix = '') {
        const flattened = {};
        Object.keys(obj).forEach((key) => {
            const value = obj[key];
            const newKey = prefix ? `${prefix}.${key}` : key;
            if (value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                !(value instanceof Date)) {
                Object.assign(flattened, this.flattenObject(value, newKey));
            }
            else {
                flattened[newKey] = value;
            }
        });
        return flattened;
    }
    /**
     * Get task execution history
     */
    getExecutionHistory(taskId) {
        return Array.from(this.executions.values())
            .filter((e) => e.taskId === taskId)
            .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    }
    /**
     * Get task statistics
     */
    getTaskStatistics(taskId) {
        const executions = this.getExecutionHistory(taskId);
        const successful = executions.filter((e) => e.status === 'completed').length;
        const failed = executions.filter((e) => e.status === 'failed').length;
        const completedExecutions = executions.filter((e) => e.duration !== undefined);
        const averageDuration = completedExecutions.length > 0
            ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) /
                completedExecutions.length
            : 0;
        const successRate = executions.length > 0 ? (successful / executions.length) * 100 : 0;
        return {
            totalExecutions: executions.length,
            successful,
            failed,
            averageDuration,
            successRate,
        };
    }
    /**
     * Stop all scheduled tasks
     */
    stopAllSchedules() {
        this.scheduledJobs.forEach((job) => job.stop());
        this.scheduledJobs.clear();
        this.emit('all_schedules.stopped');
    }
    /**
     * Cancel a running execution
     */
    cancelExecution(executionId) {
        const execution = this.executions.get(executionId);
        if (execution && execution.status === 'running') {
            execution.status = 'cancelled';
            execution.completedAt = new Date();
            this.runningExecutions.delete(executionId);
            this.emit('execution.cancelled', execution);
        }
    }
}
exports.RPAEngine = RPAEngine;
exports.default = RPAEngine;
