"use strict";
// @ts-nocheck
// IntelGraph Autonomous Orchestrator - Containerized Action Sandbox
// Implements secure, isolated execution environment with comprehensive security controls
// Version: 1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionSandbox = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_1 = require("crypto");
const url_1 = require("url");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const prometheus_js_1 = require("../observability/prometheus.js");
class ActionSandbox {
    config;
    runningContainers = new Map();
    sandboxDirectory;
    constructor(config = {}) {
        this.config = {
            containerRuntime: config.containerRuntime || 'docker',
            baseImage: config.baseImage || 'intelgraph/secure-sandbox:latest',
            maxExecutionTimeMs: config.maxExecutionTimeMs || 300000, // 5 minutes
            maxMemoryMB: config.maxMemoryMB || 512,
            maxCpuCores: config.maxCpuCores || 2,
            networkMode: config.networkMode || 'none',
            allowedOutboundDomains: config.allowedOutboundDomains || [
                'api.intelgraph.ai',
                'pypi.org',
                'github.com',
                'raw.githubusercontent.com',
            ],
            blockedOutboundCIDRs: config.blockedOutboundCIDRs || [
                '10.0.0.0/8',
                '172.16.0.0/12',
                '192.168.0.0/16',
                '127.0.0.0/8',
                '169.254.0.0/16',
                '::1/128',
                'fd00::/8',
            ],
            tempDirectory: config.tempDirectory || '/tmp/intelgraph-sandbox',
            enableSeccomp: config.enableSeccomp ?? true,
            enableAppArmor: config.enableAppArmor ?? true,
            enableSELinux: config.enableSELinux ?? false,
            readOnlyRootFilesystem: config.readOnlyRootFilesystem ?? true,
            dropCapabilities: config.dropCapabilities || ['ALL'],
            maxFileSize: config.maxFileSize || 10485760, // 10MB
            maxProcesses: config.maxProcesses || 50,
        };
        this.sandboxDirectory = (0, path_1.resolve)(this.config.tempDirectory);
        logger_js_1.default.info('ActionSandbox initialized', {
            runtime: this.config.containerRuntime,
            baseImage: this.config.baseImage,
            sandboxDirectory: this.sandboxDirectory,
        });
    }
    /**
     * Initialize the sandbox environment
     */
    async initialize() {
        try {
            // Create sandbox directory
            await fs_1.promises.mkdir(this.sandboxDirectory, { recursive: true });
            // Verify container runtime is available
            await this.verifyContainerRuntime();
            // Pull base image if needed
            await this.ensureBaseImage();
            // Setup network policies
            if (this.config.networkMode === 'restricted') {
                await this.setupNetworkPolicies();
            }
            // Create security profiles
            await this.createSecurityProfiles();
            logger_js_1.default.info('ActionSandbox initialized successfully');
        }
        catch (error) {
            logger_js_1.default.error('Failed to initialize ActionSandbox', {
                error: error.message,
            });
            throw error;
        }
    }
    /**
     * Execute an action in a secure sandbox
     */
    async executeAction(request) {
        const startTime = Date.now();
        const containerId = `sandbox-${request.id}-${(0, crypto_1.randomBytes)(8).toString('hex')}`;
        const workspaceDir = (0, path_1.join)(this.sandboxDirectory, containerId);
        logger_js_1.default.info('Starting sandboxed action execution', {
            actionId: request.id,
            actionType: request.type,
            containerId,
        });
        try {
            // Validate request
            await this.validateActionRequest(request);
            // Create workspace
            await this.createWorkspace(workspaceDir, request);
            // Build container arguments
            const containerArgs = await this.buildContainerArgs(containerId, workspaceDir, request);
            // Execute container
            const result = await this.executeContainer(containerId, containerArgs, request);
            // Collect output files
            const outputFiles = await this.collectOutputFiles(workspaceDir);
            // Calculate execution time
            const executionTime = Date.now() - startTime;
            // Record metrics
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('sandbox_execution_duration_ms', executionTime, { action_type: request.type, success: result.success.toString() });
            const actionResult = {
                id: request.id,
                success: result.success,
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr,
                executionTime,
                resourceUsage: result.resourceUsage,
                securityEvents: result.securityEvents,
                files: outputFiles,
                metadata: {
                    containerId,
                    runtime: this.config.containerRuntime,
                    networkMode: this.config.networkMode,
                },
            };
            logger_js_1.default.info('Sandboxed action execution completed', {
                actionId: request.id,
                success: result.success,
                executionTime,
                securityEvents: result.securityEvents.length,
            });
            return actionResult;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            logger_js_1.default.error('Sandboxed action execution failed', {
                actionId: request.id,
                error: error.message,
                executionTime,
            });
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('sandbox_execution_error', false, { action_type: request.type, error_type: error.name });
            throw error;
        }
        finally {
            // Cleanup
            await this.cleanup(containerId, workspaceDir);
        }
    }
    /**
     * Validate action request for security and compliance
     */
    async validateActionRequest(request) {
        const violations = [];
        // Check for dangerous commands
        if (request.command) {
            const dangerousCommands = [
                'rm',
                'sudo',
                'chmod',
                'chown',
                'dd',
                'mkfs',
                'fdisk',
            ];
            const command = request.command.toLowerCase();
            if (dangerousCommands.some((dangerous) => command.includes(dangerous))) {
                violations.push(`Dangerous command detected: ${request.command}`);
            }
        }
        // Check for dangerous code patterns
        if (request.code) {
            const dangerousPatterns = [
                /import\s+os/i,
                /import\s+subprocess/i,
                /exec\(/i,
                /eval\(/i,
                /system\(/i,
                /shell_exec/i,
                /__import__/i,
                /globals\(\)/i,
                /locals\(\)/i,
            ];
            dangerousPatterns.forEach((pattern) => {
                if (pattern.test(request.code)) {
                    violations.push(`Potentially dangerous code pattern: ${pattern.source}`);
                }
            });
        }
        // Check network access requests
        if (request.networkAccess?.allowed) {
            if (request.networkAccess.domains) {
                request.networkAccess.domains.forEach((domain) => {
                    if (!this.isDomainAllowed(domain)) {
                        violations.push(`Network access to domain not allowed: ${domain}`);
                    }
                });
            }
        }
        // Check resource limits
        if (request.resourceLimits) {
            if (request.resourceLimits.memory &&
                request.resourceLimits.memory > this.config.maxMemoryMB) {
                violations.push(`Memory limit exceeds maximum: ${request.resourceLimits.memory}MB > ${this.config.maxMemoryMB}MB`);
            }
            if (request.resourceLimits.cpu &&
                request.resourceLimits.cpu > this.config.maxCpuCores) {
                violations.push(`CPU limit exceeds maximum: ${request.resourceLimits.cpu} > ${this.config.maxCpuCores}`);
            }
        }
        // Check file content
        if (request.files) {
            Object.entries(request.files).forEach(([filename, content]) => {
                if (content.length > this.config.maxFileSize) {
                    violations.push(`File size exceeds limit: ${filename} (${content.length} bytes)`);
                }
                // Check for suspicious file extensions
                const suspiciousExtensions = [
                    '.exe',
                    '.dll',
                    '.so',
                    '.dylib',
                    '.bat',
                    '.cmd',
                    '.ps1',
                ];
                const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
                if (suspiciousExtensions.includes(ext)) {
                    violations.push(`Suspicious file extension: ${filename}`);
                }
            });
        }
        if (violations.length > 0) {
            const error = new Error(`Security violations detected: ${violations.join(', ')}`);
            error.name = 'SecurityViolationError';
            throw error;
        }
    }
    /**
     * Check if domain is allowed for network access
     */
    isDomainAllowed(domain) {
        try {
            const url = new url_1.URL(`https://${domain}`);
            const hostname = url.hostname;
            // Check against allowed domains
            for (const allowed of this.config.allowedOutboundDomains) {
                if (hostname === allowed || hostname.endsWith(`.${allowed}`)) {
                    return true;
                }
            }
            return false;
        }
        catch {
            return false;
        }
    }
    /**
     * Create workspace directory with input files
     */
    async createWorkspace(workspaceDir, request) {
        await fs_1.promises.mkdir(workspaceDir, { recursive: true });
        // Create input files
        if (request.files) {
            for (const [filename, content] of Object.entries(request.files)) {
                const safePath = this.sanitizeFilePath(filename);
                const filePath = (0, path_1.join)(workspaceDir, safePath);
                // Ensure file is within workspace
                if (!filePath.startsWith(workspaceDir)) {
                    throw new Error(`Invalid file path: ${filename}`);
                }
                await fs_1.promises.mkdir((0, path_1.join)(filePath, '..'), { recursive: true });
                await fs_1.promises.writeFile(filePath, content);
            }
        }
        // Create execution script if code is provided
        if (request.code) {
            const scriptPath = (0, path_1.join)(workspaceDir, 'execute.py');
            await fs_1.promises.writeFile(scriptPath, request.code);
        }
        // Create entrypoint script
        const entrypoint = this.createEntrypoint(request);
        await fs_1.promises.writeFile((0, path_1.join)(workspaceDir, 'entrypoint.sh'), entrypoint, {
            mode: 0o755,
        });
    }
    /**
     * Sanitize file path to prevent directory traversal
     */
    sanitizeFilePath(filename) {
        return (0, path_1.basename)(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    }
    /**
     * Create entrypoint script for container execution
     */
    createEntrypoint(request) {
        let script = '#!/bin/bash\nset -euo pipefail\n\n';
        // Set environment variables
        if (request.environment) {
            Object.entries(request.environment).forEach(([key, value]) => {
                const safeKey = key.replace(/[^A-Z0-9_]/g, '');
                const safeValue = value.replace(/'/g, "'\"'\"'");
                script += `export ${safeKey}='${safeValue}'\n`;
            });
        }
        // Change to working directory if specified
        if (request.workingDirectory) {
            script += `cd "${request.workingDirectory}"\n`;
        }
        // Execute command or code
        if (request.command) {
            const args = request.args
                ? ' ' + request.args.map((arg) => `"${arg}"`).join(' ')
                : '';
            script += `exec ${request.command}${args}\n`;
        }
        else if (request.code) {
            script += 'exec python3 execute.py\n';
        }
        return script;
    }
    /**
     * Build container execution arguments
     */
    async buildContainerArgs(containerId, workspaceDir, request) {
        const args = [
            'run',
            '--name',
            containerId,
            '--rm',
            '--user',
            '1000:1000', // Non-root user
            '--workdir',
            '/workspace',
            '--volume',
            `${workspaceDir}:/workspace:rw`,
            '--memory',
            `${this.config.maxMemoryMB}m`,
            '--cpus',
            this.config.maxCpuCores.toString(),
            '--pids-limit',
            this.config.maxProcesses.toString(),
            '--ulimit',
            `fsize=${this.config.maxFileSize}`,
            '--ulimit',
            'nproc=50:50',
            '--ulimit',
            'nofile=1024:1024',
        ];
        // Network configuration
        if (this.config.networkMode === 'none') {
            args.push('--network', 'none');
        }
        else if (this.config.networkMode === 'restricted') {
            args.push('--network', 'restricted_sandbox');
        }
        // Security configurations
        if (this.config.readOnlyRootFilesystem) {
            args.push('--read-only');
            args.push('--tmpfs', '/tmp:rw,noexec,nosuid,size=100m');
        }
        if (this.config.enableSeccomp) {
            args.push('--security-opt', 'seccomp=/etc/docker/seccomp/sandbox-profile.json');
        }
        if (this.config.enableAppArmor) {
            args.push('--security-opt', 'apparmor=sandbox-profile');
        }
        if (this.config.dropCapabilities.length > 0) {
            this.config.dropCapabilities.forEach((cap) => {
                args.push('--cap-drop', cap);
            });
        }
        // Timeout
        const timeout = request.timeout || this.config.maxExecutionTimeMs;
        args.push('--stop-timeout', Math.floor(timeout / 1000).toString());
        // Environment variables
        args.push('--env', 'PYTHONUNBUFFERED=1');
        args.push('--env', 'PYTHONDONTWRITEBYTECODE=1');
        // Base image
        args.push(this.config.baseImage);
        // Entrypoint
        args.push('/workspace/entrypoint.sh');
        return args;
    }
    /**
     * Execute container and monitor execution
     */
    async executeContainer(containerId, args, request) {
        return new Promise((resolve, reject) => {
            const timeout = request.timeout || this.config.maxExecutionTimeMs;
            const securityEvents = [];
            let stdout = '';
            let stderr = '';
            let isTimedOut = false;
            logger_js_1.default.debug('Starting container execution', {
                containerId,
                runtime: this.config.containerRuntime,
                args: args.join(' '),
            });
            const containerProcess = (0, child_process_1.spawn)(this.config.containerRuntime, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: false,
            });
            this.runningContainers.set(containerId, containerProcess);
            // Handle stdout
            containerProcess.stdout?.on('data', (data) => {
                const chunk = data.toString();
                stdout += chunk;
                // Monitor for security events in output
                this.detectSecurityEvents(chunk, securityEvents);
            });
            // Handle stderr
            containerProcess.stderr?.on('data', (data) => {
                const chunk = data.toString();
                stderr += chunk;
                // Monitor for security events in error output
                this.detectSecurityEvents(chunk, securityEvents);
            });
            // Set execution timeout
            const timeoutHandle = setTimeout(() => {
                isTimedOut = true;
                logger_js_1.default.warn('Container execution timed out', { containerId, timeout });
                securityEvents.push({
                    type: 'resource_limit_exceeded',
                    timestamp: new Date().toISOString(),
                    details: `Execution timeout after ${timeout}ms`,
                    severity: 'medium',
                    blocked: true,
                });
                containerProcess.kill('SIGKILL');
            }, timeout);
            // Handle process completion
            containerProcess.on('close', async (code) => {
                clearTimeout(timeoutHandle);
                this.runningContainers.delete(containerId);
                try {
                    // Collect resource usage statistics
                    const resourceUsage = await this.collectResourceUsage(containerId);
                    resolve({
                        success: code === 0 && !isTimedOut,
                        exitCode: isTimedOut ? 124 : code || 0, // 124 is timeout exit code
                        stdout: stdout.substring(0, 100000), // Limit output size
                        stderr: stderr.substring(0, 100000),
                        resourceUsage,
                        securityEvents,
                    });
                }
                catch (error) {
                    reject(error);
                }
            });
            // Handle process errors
            containerProcess.on('error', (error) => {
                clearTimeout(timeoutHandle);
                this.runningContainers.delete(containerId);
                logger_js_1.default.error('Container process error', {
                    containerId,
                    error: error.message,
                });
                reject(new Error(`Container execution failed: ${error.message}`));
            });
            // Start monitoring resource usage
            this.monitorResourceUsage(containerId, securityEvents);
        });
    }
    /**
     * Detect security events in container output
     */
    detectSecurityEvents(output, securityEvents) {
        const patterns = [
            {
                pattern: /Permission denied/i,
                type: 'file_access_denied',
                severity: 'low',
            },
            {
                pattern: /Operation not permitted/i,
                type: 'syscall_blocked',
                severity: 'medium',
            },
            {
                pattern: /Connection refused/i,
                type: 'network_violation',
                severity: 'medium',
            },
            {
                pattern: /Cannot allocate memory/i,
                type: 'resource_limit_exceeded',
                severity: 'high',
            },
            {
                pattern: /segmentation fault/i,
                type: 'suspicious_behavior',
                severity: 'high',
            },
        ];
        patterns.forEach(({ pattern, type, severity }) => {
            if (pattern.test(output)) {
                securityEvents.push({
                    type,
                    timestamp: new Date().toISOString(),
                    details: output.substring(0, 200),
                    severity,
                    blocked: false,
                });
            }
        });
    }
    /**
     * Monitor resource usage during execution
     */
    async monitorResourceUsage(containerId, securityEvents) {
        const monitoringInterval = setInterval(async () => {
            try {
                const stats = await this.getContainerStats(containerId);
                if (stats.memoryUsageMB > this.config.maxMemoryMB * 0.9) {
                    securityEvents.push({
                        type: 'resource_limit_exceeded',
                        timestamp: new Date().toISOString(),
                        details: `High memory usage: ${stats.memoryUsageMB}MB`,
                        severity: 'medium',
                        blocked: false,
                    });
                }
                if (stats.networkBytes > 100 * 1024 * 1024) {
                    // 100MB
                    securityEvents.push({
                        type: 'network_violation',
                        timestamp: new Date().toISOString(),
                        details: `High network usage: ${stats.networkBytes} bytes`,
                        severity: 'medium',
                        blocked: false,
                    });
                }
            }
            catch (error) {
                // Container may not exist anymore
                clearInterval(monitoringInterval);
            }
        }, 5000); // Check every 5 seconds
        // Clear monitoring when container is removed
        setTimeout(() => {
            clearInterval(monitoringInterval);
        }, this.config.maxExecutionTimeMs + 10000);
    }
    /**
     * Get container statistics
     */
    async getContainerStats(containerId) {
        return new Promise((resolve, reject) => {
            const statsProcess = (0, child_process_1.spawn)(this.config.containerRuntime, [
                'stats',
                '--no-stream',
                '--format',
                'json',
                containerId,
            ]);
            let output = '';
            statsProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            statsProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error('Failed to get container stats'));
                    return;
                }
                try {
                    const stats = JSON.parse(output);
                    resolve({
                        memoryUsageMB: this.parseMemoryUsage(stats.MemUsage),
                        cpuUsagePercent: parseFloat(stats.CPUPerc) || 0,
                        networkBytes: this.parseNetworkUsage(stats.NetIO),
                    });
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
    /**
     * Parse memory usage from Docker stats format
     */
    parseMemoryUsage(memUsage) {
        const match = memUsage.match(/^([\d.]+)([KMGT]?i?B)/);
        if (!match)
            return 0;
        const value = parseFloat(match[1]);
        const unit = match[2];
        switch (unit) {
            case 'B':
                return value / (1024 * 1024);
            case 'KiB':
            case 'KB':
                return value / 1024;
            case 'MiB':
            case 'MB':
                return value;
            case 'GiB':
            case 'GB':
                return value * 1024;
            default:
                return value;
        }
    }
    /**
     * Parse network usage from Docker stats format
     */
    parseNetworkUsage(netIO) {
        const match = netIO.match(/^([\d.]+[KMGT]?i?B) \/ ([\d.]+[KMGT]?i?B)$/);
        if (!match)
            return 0;
        const inbound = match[1];
        const outbound = match[2];
        return this.parseByteSize(inbound) + this.parseByteSize(outbound);
    }
    /**
     * Parse byte size string
     */
    parseByteSize(sizeStr) {
        const match = sizeStr.match(/^([\d.]+)([KMGT]?i?B)$/);
        if (!match)
            return 0;
        const value = parseFloat(match[1]);
        const unit = match[2];
        switch (unit) {
            case 'B':
                return value;
            case 'KiB':
            case 'KB':
                return value * 1024;
            case 'MiB':
            case 'MB':
                return value * 1024 * 1024;
            case 'GiB':
            case 'GB':
                return value * 1024 * 1024 * 1024;
            default:
                return value;
        }
    }
    /**
     * Collect resource usage after execution
     */
    async collectResourceUsage(containerId) {
        try {
            // Try to get final stats if container still exists
            const stats = await this.getContainerStats(containerId);
            return {
                maxMemoryMB: stats.memoryUsageMB,
                cpuTimeMs: Math.round(stats.cpuUsagePercent * 10), // Rough approximation
                diskUsageMB: 0, // Would need additional monitoring
                networkBytes: stats.networkBytes,
            };
        }
        catch {
            // Return default if stats unavailable
            return {
                maxMemoryMB: 0,
                cpuTimeMs: 0,
                diskUsageMB: 0,
                networkBytes: 0,
            };
        }
    }
    /**
     * Collect output files from workspace
     */
    async collectOutputFiles(workspaceDir) {
        const outputFiles = {};
        try {
            const files = await fs_1.promises.readdir(workspaceDir);
            for (const file of files) {
                if (file.startsWith('output_') || file === 'result.json') {
                    const filePath = (0, path_1.join)(workspaceDir, file);
                    const stats = await fs_1.promises.stat(filePath);
                    if (stats.isFile() && stats.size <= this.config.maxFileSize) {
                        const content = await fs_1.promises.readFile(filePath, 'utf8');
                        outputFiles[file] = content;
                    }
                }
            }
        }
        catch (error) {
            logger_js_1.default.warn('Failed to collect output files', {
                workspaceDir,
                error: error.message,
            });
        }
        return outputFiles;
    }
    /**
     * Cleanup container and workspace
     */
    async cleanup(containerId, workspaceDir) {
        try {
            // Kill container if still running
            if (this.runningContainers.has(containerId)) {
                const process = this.runningContainers.get(containerId);
                process.kill('SIGKILL');
                this.runningContainers.delete(containerId);
            }
            // Force remove container
            try {
                await new Promise((resolve, reject) => {
                    const removeProcess = (0, child_process_1.spawn)(this.config.containerRuntime, [
                        'rm',
                        '-f',
                        containerId,
                    ]);
                    removeProcess.on('close', () => resolve());
                    removeProcess.on('error', reject);
                    setTimeout(resolve, 5000); // Timeout after 5 seconds
                });
            }
            catch (error) {
                logger_js_1.default.warn('Failed to remove container', {
                    containerId,
                    error: error.message,
                });
            }
            // Remove workspace directory
            try {
                await fs_1.promises.rm(workspaceDir, { recursive: true, force: true });
            }
            catch (error) {
                logger_js_1.default.warn('Failed to remove workspace', {
                    workspaceDir,
                    error: error.message,
                });
            }
        }
        catch (error) {
            logger_js_1.default.error('Cleanup failed', {
                containerId,
                workspaceDir,
                error: error.message,
            });
        }
    }
    /**
     * Verify container runtime is available
     */
    async verifyContainerRuntime() {
        return new Promise((resolve, reject) => {
            const testProcess = (0, child_process_1.spawn)(this.config.containerRuntime, ['version'], {
                stdio: 'ignore',
            });
            testProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`Container runtime ${this.config.containerRuntime} not available`));
                }
            });
            testProcess.on('error', (error) => {
                reject(new Error(`Failed to verify container runtime: ${error.message}`));
            });
        });
    }
    /**
     * Ensure base image is available
     */
    async ensureBaseImage() {
        return new Promise((resolve, reject) => {
            const pullProcess = (0, child_process_1.spawn)(this.config.containerRuntime, [
                'pull',
                this.config.baseImage,
            ]);
            pullProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`Failed to pull base image: ${this.config.baseImage}`));
                }
            });
            pullProcess.on('error', (error) => {
                reject(new Error(`Failed to pull image: ${error.message}`));
            });
        });
    }
    /**
     * Setup network policies for restricted mode
     */
    async setupNetworkPolicies() {
        // This would typically involve setting up iptables rules or similar
        // For now, we'll create a custom Docker network with restrictions
        try {
            await new Promise((resolve, reject) => {
                const networkProcess = (0, child_process_1.spawn)(this.config.containerRuntime, [
                    'network',
                    'create',
                    '--driver',
                    'bridge',
                    '--internal',
                    'restricted_sandbox',
                ]);
                networkProcess.on('close', (code) => {
                    if (code === 0 || code === 125) {
                        // 125 means network already exists
                        resolve();
                    }
                    else {
                        reject(new Error('Failed to create restricted network'));
                    }
                });
                networkProcess.on('error', reject);
            });
        }
        catch (error) {
            logger_js_1.default.warn('Failed to setup network policies', { error: error.message });
        }
    }
    /**
     * Create security profiles (seccomp, AppArmor)
     */
    async createSecurityProfiles() {
        // Create seccomp profile
        if (this.config.enableSeccomp) {
            const seccompProfile = {
                defaultAction: 'SCMP_ACT_ERRNO',
                architectures: ['SCMP_ARCH_X86_64'],
                syscalls: [
                    {
                        names: [
                            'accept',
                            'accept4',
                            'access',
                            'brk',
                            'clone',
                            'close',
                            'connect',
                            'dup',
                            'dup2',
                            'execve',
                            'exit',
                            'exit_group',
                            'fcntl',
                            'fstat',
                            'futex',
                            'getdents',
                            'getdents64',
                            'getpid',
                            'getppid',
                            'getrlimit',
                            'gettid',
                            'ioctl',
                            'lseek',
                            'madvise',
                            'mkdir',
                            'mmap',
                            'mprotect',
                            'munmap',
                            'open',
                            'openat',
                            'read',
                            'readv',
                            'rt_sigaction',
                            'rt_sigprocmask',
                            'rt_sigreturn',
                            'select',
                            'set_thread_area',
                            'socket',
                            'stat',
                            'write',
                            'writev',
                        ],
                        action: 'SCMP_ACT_ALLOW',
                    },
                ],
            };
            try {
                await fs_1.promises.writeFile('/etc/docker/seccomp/sandbox-profile.json', JSON.stringify(seccompProfile, null, 2));
            }
            catch (error) {
                logger_js_1.default.warn('Failed to create seccomp profile', {
                    error: error.message,
                });
            }
        }
        // Create AppArmor profile would go here
        // This requires system-level configuration
    }
    /**
     * Stop all running containers
     */
    async stopAllContainers() {
        const promises = Array.from(this.runningContainers.entries()).map(async ([containerId, process]) => {
            try {
                process.kill('SIGTERM');
                // Wait a bit then force kill
                setTimeout(() => {
                    if (this.runningContainers.has(containerId)) {
                        process.kill('SIGKILL');
                    }
                }, 5000);
            }
            catch (error) {
                logger_js_1.default.error('Failed to stop container', {
                    containerId,
                    error: error.message,
                });
            }
        });
        await Promise.allSettled(promises);
        this.runningContainers.clear();
        logger_js_1.default.info('All sandbox containers stopped');
    }
    /**
     * Get sandbox statistics
     */
    async getStats() {
        // This would typically query metrics from a database
        // For now, return current state
        return {
            runningContainers: this.runningContainers.size,
            totalExecutions: 0, // Would track in metrics
            averageExecutionTime: 0, // Would calculate from metrics
            securityViolations: 0, // Would count from events
        };
    }
}
exports.ActionSandbox = ActionSandbox;
exports.default = ActionSandbox;
