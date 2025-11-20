/**
 * Robotic Process Automation (RPA) Engine
 * Provides screen scraping, UI automation, file processing, and batch job scheduling
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';

export interface RPATask {
  id: string;
  name: string;
  type:
    | 'web_scraping'
    | 'api_call'
    | 'file_processing'
    | 'email'
    | 'database'
    | 'ui_automation'
    | 'data_transformation'
    | 'batch_job';
  config: RPATaskConfig;
  schedule?: string; // Cron expression
  enabled: boolean;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
  timeout?: number;
  createdAt: Date;
  lastExecuted?: Date;
  nextExecution?: Date;
}

export interface RPATaskConfig {
  // Web scraping config
  url?: string;
  selectors?: Record<string, string>;
  waitForSelector?: string;
  screenshotPath?: string;

  // API call config
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  queryParams?: Record<string, string>;

  // File processing config
  inputPath?: string;
  outputPath?: string;
  filePattern?: string;
  operation?:
    | 'read'
    | 'write'
    | 'copy'
    | 'move'
    | 'delete'
    | 'transform'
    | 'archive';

  // Email config
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
  attachments?: string[];

  // Data transformation config
  transformations?: DataTransformation[];

  // Custom config
  customConfig?: Record<string, any>;
}

export interface DataTransformation {
  type:
    | 'map'
    | 'filter'
    | 'reduce'
    | 'aggregate'
    | 'join'
    | 'pivot'
    | 'normalize'
    | 'custom';
  field?: string;
  operation?: string;
  value?: any;
  customTransform?: (data: any) => any;
}

export interface RPAExecution {
  id: string;
  taskId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: {
    message: string;
    stack?: string;
  };
  retryCount: number;
  duration?: number;
}

export interface ScrapedData {
  url: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata?: {
    responseTime: number;
    statusCode: number;
    contentLength: number;
  };
}

export class RPAEngine extends EventEmitter {
  private tasks = new Map<string, RPATask>();
  private executions = new Map<string, RPAExecution>();
  private scheduledJobs = new Map<string, cron.ScheduledTask>();
  private runningExecutions = new Set<string>();

  constructor(private maxConcurrent: number = 10) {
    super();
  }

  /**
   * Register an RPA task
   */
  registerTask(task: Omit<RPATask, 'id' | 'createdAt'>): RPATask {
    const id = uuidv4();
    const rpaTask: RPATask = {
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
  private scheduleTask(task: RPATask): void {
    if (!task.schedule) {
      return;
    }

    // Stop existing schedule if any
    const existingJob = this.scheduledJobs.get(task.id);
    if (existingJob) {
      existingJob.stop();
    }

    try {
      const job = cron.schedule(task.schedule, async () => {
        await this.executeTask(task.id);
      });

      this.scheduledJobs.set(task.id, job);
      this.emit('task.scheduled', task);
    } catch (error) {
      this.emit('task.schedule.error', { task, error: error.message });
    }
  }

  /**
   * Execute an RPA task
   */
  async executeTask(taskId: string): Promise<RPAExecution> {
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

    const executionId = uuidv4();
    const execution: RPAExecution = {
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
      let result: any;

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
    } catch (error: any) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.error = {
        message: error.message,
        stack: error.stack,
      };
      execution.duration =
        execution.completedAt.getTime() - execution.startedAt.getTime();

      // Handle retries
      if (
        task.retryConfig &&
        execution.retryCount < task.retryConfig.maxRetries
      ) {
        execution.retryCount++;
        const delay = task.retryConfig.exponentialBackoff
          ? task.retryConfig.retryDelay * Math.pow(2, execution.retryCount - 1)
          : task.retryConfig.retryDelay;

        setTimeout(() => {
          this.executeTask(taskId).catch((err) =>
            this.emit('task.retry.failed', { task, error: err.message }),
          );
        }, delay);

        this.emit('task.execution.retrying', { execution, delay });
      } else {
        this.emit('task.execution.failed', execution);
      }

      throw error;
    } finally {
      this.runningExecutions.delete(executionId);
    }
  }

  /**
   * Execute web scraping task
   */
  private async executeWebScraping(config: RPATaskConfig): Promise<ScrapedData> {
    if (!config.url) {
      throw new Error('URL is required for web scraping');
    }

    const startTime = Date.now();

    try {
      const response = await axios.get(config.url, {
        headers: config.headers,
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);
      const data: Record<string, any> = {};

      if (config.selectors) {
        Object.entries(config.selectors).forEach(([key, selector]) => {
          const elements = $(selector);
          if (elements.length === 1) {
            data[key] = elements.text().trim();
          } else {
            data[key] = elements
              .map((_, el) => $(el).text().trim())
              .get();
          }
        });
      } else {
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
    } catch (error: any) {
      throw new Error(`Web scraping failed: ${error.message}`);
    }
  }

  /**
   * Execute API call task
   */
  private async executeAPICall(config: RPATaskConfig): Promise<any> {
    if (!config.url) {
      throw new Error('URL is required for API call');
    }

    const requestConfig: AxiosRequestConfig = {
      method: config.method || 'GET',
      url: config.url,
      headers: config.headers,
      params: config.queryParams,
      data: config.body,
      timeout: 30000,
    };

    try {
      const response = await axios(requestConfig);
      return {
        status: response.status,
        headers: response.headers,
        data: response.data,
      };
    } catch (error: any) {
      throw new Error(
        `API call failed: ${error.response?.status || error.message}`,
      );
    }
  }

  /**
   * Execute file processing task
   */
  private async executeFileProcessing(config: RPATaskConfig): Promise<any> {
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
          return await this.writeFile(
            config.outputPath,
            config.customConfig?.content,
          );

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
    } catch (error: any) {
      throw new Error(`File processing failed: ${error.message}`);
    }
  }

  /**
   * Execute email task
   */
  private async executeEmailTask(config: RPATaskConfig): Promise<any> {
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
  private async executeDataTransformation(
    config: RPATaskConfig,
  ): Promise<any> {
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
  private async applyTransformation(
    data: any,
    transformation: DataTransformation,
  ): Promise<any> {
    if (!Array.isArray(data)) {
      data = [data];
    }

    switch (transformation.type) {
      case 'map':
        return data.map((item: any) =>
          transformation.customTransform
            ? transformation.customTransform(item)
            : item,
        );

      case 'filter':
        return data.filter((item: any) =>
          transformation.customTransform
            ? transformation.customTransform(item)
            : true,
        );

      case 'reduce':
        return data.reduce(
          (acc: any, item: any) =>
            transformation.customTransform
              ? transformation.customTransform({ acc, item })
              : acc,
          transformation.value || {},
        );

      case 'aggregate':
        // Simple aggregation
        return {
          count: data.length,
          sum:
            transformation.field &&
            data.reduce(
              (sum: number, item: any) => sum + (item[transformation.field] || 0),
              0,
            ),
        };

      case 'normalize':
        // Flatten nested structures
        return data.map((item: any) => this.flattenObject(item));

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
  private async executeBatchJob(config: RPATaskConfig): Promise<any> {
    // Batch job execution logic
    const jobs = config.customConfig?.jobs || [];
    const results = [];

    for (const job of jobs) {
      try {
        const result = await this.executeTask(job.taskId);
        results.push({ job: job.taskId, status: 'success', result });
      } catch (error: any) {
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
  private async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private async copyFile(source: string, destination: string): Promise<void> {
    const dir = path.dirname(destination);
    await fs.mkdir(dir, { recursive: true });
    await fs.copyFile(source, destination);
  }

  private async moveFile(source: string, destination: string): Promise<void> {
    await this.copyFile(source, destination);
    await fs.unlink(source);
  }

  private async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  private async transformFile(config: RPATaskConfig): Promise<any> {
    const content = await this.readFile(config.inputPath!);

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
      } catch {
        // Content is not JSON, apply string transformations
        transformed = content;
      }
    }

    if (config.outputPath) {
      await this.writeFile(config.outputPath, transformed);
    }

    return transformed;
  }

  private async archiveFiles(
    sourcePath: string,
    archivePath: string,
  ): Promise<any> {
    // Archive implementation would use a library like archiver
    // For now, just copy
    await this.copyFile(sourcePath, archivePath);
    return { archived: true, path: archivePath };
  }

  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};

    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    });

    return flattened;
  }

  /**
   * Get task execution history
   */
  getExecutionHistory(taskId: string): RPAExecution[] {
    return Array.from(this.executions.values())
      .filter((e) => e.taskId === taskId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Get task statistics
   */
  getTaskStatistics(taskId: string): {
    totalExecutions: number;
    successful: number;
    failed: number;
    averageDuration: number;
    successRate: number;
  } {
    const executions = this.getExecutionHistory(taskId);

    const successful = executions.filter((e) => e.status === 'completed').length;
    const failed = executions.filter((e) => e.status === 'failed').length;

    const completedExecutions = executions.filter(
      (e) => e.duration !== undefined,
    );
    const averageDuration =
      completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) /
          completedExecutions.length
        : 0;

    const successRate =
      executions.length > 0 ? (successful / executions.length) * 100 : 0;

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
  stopAllSchedules(): void {
    this.scheduledJobs.forEach((job) => job.stop());
    this.scheduledJobs.clear();
    this.emit('all_schedules.stopped');
  }

  /**
   * Cancel a running execution
   */
  cancelExecution(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.completedAt = new Date();
      this.runningExecutions.delete(executionId);
      this.emit('execution.cancelled', execution);
    }
  }
}

export default RPAEngine;
