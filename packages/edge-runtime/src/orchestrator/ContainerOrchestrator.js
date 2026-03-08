"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerOrchestrator = void 0;
const dockerode_1 = __importDefault(require("dockerode"));
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const pino_1 = require("pino");
/**
 * Container Orchestrator
 * Manages Docker containers on edge nodes
 */
class ContainerOrchestrator extends eventemitter3_1.default {
    docker;
    logger;
    containers = new Map();
    constructor(dockerOptions, logger) {
        super();
        this.docker = new dockerode_1.default(dockerOptions || { socketPath: '/var/run/docker.sock' });
        this.logger = logger || (0, pino_1.pino)({ name: 'ContainerOrchestrator' });
    }
    /**
     * Deploy a container
     */
    async deployContainer(options) {
        try {
            this.logger.info({ image: options.image }, 'Deploying container');
            // Pull image if not available
            await this.pullImage(options.image);
            // Create container
            const createOptions = {
                Image: options.image,
                name: options.name,
                Env: options.env ? Object.entries(options.env).map(([k, v]) => `${k}=${v}`) : undefined,
                ExposedPorts: options.ports ? this.formatExposedPorts(options.ports) : undefined,
                HostConfig: {
                    PortBindings: options.ports ? this.formatPortBindings(options.ports) : undefined,
                    Binds: options.volumes?.map(v => `${v.host}:${v.container}${v.readOnly ? ':ro' : ''}`) || undefined,
                    Memory: options.memory,
                    NanoCpus: options.cpus ? options.cpus * 1e9 : undefined,
                    RestartPolicy: {
                        Name: options.restartPolicy || 'unless-stopped',
                        MaximumRetryCount: options.restartPolicy === 'on-failure' ? 3 : 0
                    },
                    NetworkMode: options.network
                },
                Labels: options.labels,
                Healthcheck: options.healthCheck ? {
                    Test: options.healthCheck.test,
                    Interval: options.healthCheck.interval ? options.healthCheck.interval * 1e6 : undefined,
                    Timeout: options.healthCheck.timeout ? options.healthCheck.timeout * 1e6 : undefined,
                    Retries: options.healthCheck.retries
                } : undefined
            };
            const container = await this.docker.createContainer(createOptions);
            await container.start();
            const info = await this.getContainerInfo(container.id);
            this.containers.set(container.id, info);
            this.logger.info({ containerId: container.id, name: options.name }, 'Container deployed');
            this.emit('container-deployed', { containerId: container.id, info });
            return container.id;
        }
        catch (error) {
            this.logger.error({ error, image: options.image }, 'Failed to deploy container');
            throw error;
        }
    }
    /**
     * Pull Docker image
     */
    async pullImage(image) {
        try {
            this.logger.info({ image }, 'Pulling image');
            await new Promise((resolve, reject) => {
                this.docker.pull(image, (err, stream) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    this.docker.modem.followProgress(stream, (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                });
            });
            this.logger.info({ image }, 'Image pulled successfully');
        }
        catch (error) {
            this.logger.error({ error, image }, 'Failed to pull image');
            throw error;
        }
    }
    /**
     * Stop a container
     */
    async stopContainer(containerId, timeout = 10) {
        try {
            const container = this.docker.getContainer(containerId);
            await container.stop({ t: timeout });
            const info = await this.getContainerInfo(containerId);
            this.containers.set(containerId, info);
            this.logger.info({ containerId }, 'Container stopped');
            this.emit('container-stopped', { containerId });
        }
        catch (error) {
            this.logger.error({ error, containerId }, 'Failed to stop container');
            throw error;
        }
    }
    /**
     * Start a container
     */
    async startContainer(containerId) {
        try {
            const container = this.docker.getContainer(containerId);
            await container.start();
            const info = await this.getContainerInfo(containerId);
            this.containers.set(containerId, info);
            this.logger.info({ containerId }, 'Container started');
            this.emit('container-started', { containerId });
        }
        catch (error) {
            this.logger.error({ error, containerId }, 'Failed to start container');
            throw error;
        }
    }
    /**
     * Remove a container
     */
    async removeContainer(containerId, force = false) {
        try {
            const container = this.docker.getContainer(containerId);
            await container.remove({ force });
            this.containers.delete(containerId);
            this.logger.info({ containerId }, 'Container removed');
            this.emit('container-removed', { containerId });
        }
        catch (error) {
            this.logger.error({ error, containerId }, 'Failed to remove container');
            throw error;
        }
    }
    /**
     * Restart a container
     */
    async restartContainer(containerId, timeout = 10) {
        try {
            const container = this.docker.getContainer(containerId);
            await container.restart({ t: timeout });
            const info = await this.getContainerInfo(containerId);
            this.containers.set(containerId, info);
            this.logger.info({ containerId }, 'Container restarted');
            this.emit('container-restarted', { containerId });
        }
        catch (error) {
            this.logger.error({ error, containerId }, 'Failed to restart container');
            throw error;
        }
    }
    /**
     * Get container logs
     */
    async getContainerLogs(containerId, options) {
        try {
            const container = this.docker.getContainer(containerId);
            const logs = await container.logs({
                stdout: true,
                stderr: true,
                tail: options?.tail || 100,
                since: options?.since,
                timestamps: options?.timestamps || true
            });
            return logs.toString('utf-8');
        }
        catch (error) {
            this.logger.error({ error, containerId }, 'Failed to get container logs');
            throw error;
        }
    }
    /**
     * Execute command in container
     */
    async execInContainer(containerId, cmd, options) {
        try {
            const container = this.docker.getContainer(containerId);
            const exec = await container.exec({
                Cmd: cmd,
                AttachStdout: true,
                AttachStderr: true,
                Env: options?.env,
                WorkingDir: options?.workingDir
            });
            const stream = await exec.start({ Detach: false });
            let output = '';
            stream.on('data', (chunk) => {
                output += chunk.toString('utf-8');
            });
            await new Promise((resolve) => {
                stream.on('end', resolve);
            });
            const inspect = await exec.inspect();
            return {
                exitCode: inspect.ExitCode || 0,
                output
            };
        }
        catch (error) {
            this.logger.error({ error, containerId, cmd }, 'Failed to execute command in container');
            throw error;
        }
    }
    /**
     * Get container info
     */
    async getContainerInfo(containerId) {
        try {
            const container = this.docker.getContainer(containerId);
            const data = await container.inspect();
            return {
                id: data.Id,
                name: data.Name.replace(/^\//, ''),
                image: data.Config.Image,
                status: data.State.Status,
                state: data.State,
                created: new Date(data.Created),
                ports: Object.entries(data.NetworkSettings.Ports || {}).flatMap(([containerPort, bindings]) => {
                    if (!bindings) {
                        return [];
                    }
                    return bindings.map(binding => ({
                        privatePort: parseInt(containerPort.split('/')[0]),
                        publicPort: binding.HostPort ? parseInt(binding.HostPort) : undefined,
                        type: containerPort.split('/')[1] || 'tcp'
                    }));
                }),
                labels: data.Config.Labels || {}
            };
        }
        catch (error) {
            this.logger.error({ error, containerId }, 'Failed to get container info');
            throw error;
        }
    }
    /**
     * List all containers
     */
    async listContainers(all = false) {
        try {
            const containers = await this.docker.listContainers({ all });
            return Promise.all(containers.map(c => this.getContainerInfo(c.Id)));
        }
        catch (error) {
            this.logger.error({ error }, 'Failed to list containers');
            throw error;
        }
    }
    /**
     * Get container statistics
     */
    async getContainerStats(containerId) {
        try {
            const container = this.docker.getContainer(containerId);
            const stats = await container.stats({ stream: false });
            const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
            const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
            const cpuPercent = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;
            return {
                cpu: cpuPercent || 0,
                memory: {
                    usage: stats.memory_stats.usage || 0,
                    limit: stats.memory_stats.limit || 0,
                    percent: ((stats.memory_stats.usage || 0) / (stats.memory_stats.limit || 1)) * 100
                },
                network: {
                    rx: Object.values(stats.networks || {}).reduce((sum, n) => sum + (n.rx_bytes || 0), 0),
                    tx: Object.values(stats.networks || {}).reduce((sum, n) => sum + (n.tx_bytes || 0), 0)
                },
                blockIO: {
                    read: stats.blkio_stats?.io_service_bytes_recursive?.find((io) => io.op === 'Read')?.value || 0,
                    write: stats.blkio_stats?.io_service_bytes_recursive?.find((io) => io.op === 'Write')?.value || 0
                }
            };
        }
        catch (error) {
            this.logger.error({ error, containerId }, 'Failed to get container stats');
            throw error;
        }
    }
    /**
     * Format exposed ports for Docker API
     */
    formatExposedPorts(ports) {
        const exposedPorts = {};
        for (const port of ports) {
            exposedPorts[`${port.container}/tcp`] = {};
        }
        return exposedPorts;
    }
    /**
     * Format port bindings for Docker API
     */
    formatPortBindings(ports) {
        const bindings = {};
        for (const port of ports) {
            bindings[`${port.container}/tcp`] = [
                { HostPort: port.host ? port.host.toString() : '' }
            ];
        }
        return bindings;
    }
    /**
     * Monitor container health
     */
    async monitorContainerHealth(containerId, interval = 30000) {
        const checkHealth = async () => {
            try {
                const info = await this.getContainerInfo(containerId);
                if (info.state.Health) {
                    this.emit('health-status', {
                        containerId,
                        status: info.state.Health.Status,
                        log: info.state.Health.Log
                    });
                }
                const stats = await this.getContainerStats(containerId);
                this.emit('container-stats', { containerId, stats });
            }
            catch (error) {
                this.logger.error({ error, containerId }, 'Health check failed');
            }
        };
        const intervalId = setInterval(checkHealth, interval);
        // Initial check
        checkHealth();
        // Return cleanup function
        return () => clearInterval(intervalId);
    }
    /**
     * Clean up stopped containers
     */
    async pruneContainers() {
        try {
            const result = await this.docker.pruneContainers();
            this.logger.info({ count: result.ContainersDeleted?.length || 0, space: result.SpaceReclaimed }, 'Containers pruned');
            return {
                containersDeleted: result.ContainersDeleted || [],
                spaceReclaimed: result.SpaceReclaimed || 0
            };
        }
        catch (error) {
            this.logger.error({ error }, 'Failed to prune containers');
            throw error;
        }
    }
}
exports.ContainerOrchestrator = ContainerOrchestrator;
