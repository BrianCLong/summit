import Docker from 'dockerode';
import EventEmitter from 'eventemitter3';
import { pino, type Logger } from 'pino';
import type { EdgeDeployment } from '@intelgraph/edge-computing';

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: 'created' | 'running' | 'paused' | 'stopped' | 'exited' | 'dead';
  state: Docker.ContainerInspectInfo['State'];
  created: Date;
  ports: Array<{
    privatePort: number;
    publicPort?: number;
    type: string;
  }>;
  labels: Record<string, string>;
}

export interface DeploymentOptions {
  image: string;
  name?: string;
  env?: Record<string, string>;
  ports?: Array<{ container: number; host?: number }>;
  volumes?: Array<{ host: string; container: string; readOnly?: boolean }>;
  memory?: number; // bytes
  cpus?: number;
  restartPolicy?: 'no' | 'always' | 'on-failure' | 'unless-stopped';
  healthCheck?: {
    test: string[];
    interval?: number;
    timeout?: number;
    retries?: number;
  };
  labels?: Record<string, string>;
  network?: string;
}

/**
 * Container Orchestrator
 * Manages Docker containers on edge nodes
 */
export class ContainerOrchestrator extends EventEmitter {
  private docker: Docker;
  private logger: Logger;
  private containers: Map<string, ContainerInfo> = new Map();

  constructor(dockerOptions?: Docker.DockerOptions, logger?: Logger) {
    super();
    this.docker = new Docker(dockerOptions || { socketPath: '/var/run/docker.sock' });
    this.logger = logger || pino({ name: 'ContainerOrchestrator' });
  }

  /**
   * Deploy a container
   */
  async deployContainer(options: DeploymentOptions): Promise<string> {
    try {
      this.logger.info({ image: options.image }, 'Deploying container');

      // Pull image if not available
      await this.pullImage(options.image);

      // Create container
      const createOptions: Docker.ContainerCreateOptions = {
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
    } catch (error) {
      this.logger.error({ error, image: options.image }, 'Failed to deploy container');
      throw error;
    }
  }

  /**
   * Pull Docker image
   */
  private async pullImage(image: string): Promise<void> {
    try {
      this.logger.info({ image }, 'Pulling image');

      await new Promise<void>((resolve, reject) => {
        this.docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) {
            reject(err);
            return;
          }

          this.docker.modem.followProgress(stream, (err: Error | null) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      });

      this.logger.info({ image }, 'Image pulled successfully');
    } catch (error) {
      this.logger.error({ error, image }, 'Failed to pull image');
      throw error;
    }
  }

  /**
   * Stop a container
   */
  async stopContainer(containerId: string, timeout: number = 10): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: timeout });

      const info = await this.getContainerInfo(containerId);
      this.containers.set(containerId, info);

      this.logger.info({ containerId }, 'Container stopped');
      this.emit('container-stopped', { containerId });
    } catch (error) {
      this.logger.error({ error, containerId }, 'Failed to stop container');
      throw error;
    }
  }

  /**
   * Start a container
   */
  async startContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.start();

      const info = await this.getContainerInfo(containerId);
      this.containers.set(containerId, info);

      this.logger.info({ containerId }, 'Container started');
      this.emit('container-started', { containerId });
    } catch (error) {
      this.logger.error({ error, containerId }, 'Failed to start container');
      throw error;
    }
  }

  /**
   * Remove a container
   */
  async removeContainer(containerId: string, force: boolean = false): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force });

      this.containers.delete(containerId);

      this.logger.info({ containerId }, 'Container removed');
      this.emit('container-removed', { containerId });
    } catch (error) {
      this.logger.error({ error, containerId }, 'Failed to remove container');
      throw error;
    }
  }

  /**
   * Restart a container
   */
  async restartContainer(containerId: string, timeout: number = 10): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.restart({ t: timeout });

      const info = await this.getContainerInfo(containerId);
      this.containers.set(containerId, info);

      this.logger.info({ containerId }, 'Container restarted');
      this.emit('container-restarted', { containerId });
    } catch (error) {
      this.logger.error({ error, containerId }, 'Failed to restart container');
      throw error;
    }
  }

  /**
   * Get container logs
   */
  async getContainerLogs(
    containerId: string,
    options?: {
      tail?: number;
      since?: number;
      timestamps?: boolean;
    }
  ): Promise<string> {
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
    } catch (error) {
      this.logger.error({ error, containerId }, 'Failed to get container logs');
      throw error;
    }
  }

  /**
   * Execute command in container
   */
  async execInContainer(
    containerId: string,
    cmd: string[],
    options?: {
      env?: string[];
      workingDir?: string;
    }
  ): Promise<{ exitCode: number; output: string }> {
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
      stream.on('data', (chunk: Buffer) => {
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
    } catch (error) {
      this.logger.error({ error, containerId, cmd }, 'Failed to execute command in container');
      throw error;
    }
  }

  /**
   * Get container info
   */
  async getContainerInfo(containerId: string): Promise<ContainerInfo> {
    try {
      const container = this.docker.getContainer(containerId);
      const data = await container.inspect();

      return {
        id: data.Id,
        name: data.Name.replace(/^\//, ''),
        image: data.Config.Image,
        status: data.State.Status as ContainerInfo['status'],
        state: data.State,
        created: new Date(data.Created),
        ports: Object.entries(data.NetworkSettings.Ports || {}).flatMap(([containerPort, bindings]) => {
          if (!bindings) return [];
          return bindings.map(binding => ({
            privatePort: parseInt(containerPort.split('/')[0]),
            publicPort: binding.HostPort ? parseInt(binding.HostPort) : undefined,
            type: containerPort.split('/')[1] || 'tcp'
          }));
        }),
        labels: data.Config.Labels || {}
      };
    } catch (error) {
      this.logger.error({ error, containerId }, 'Failed to get container info');
      throw error;
    }
  }

  /**
   * List all containers
   */
  async listContainers(all: boolean = false): Promise<ContainerInfo[]> {
    try {
      const containers = await this.docker.listContainers({ all });

      return Promise.all(
        containers.map(c => this.getContainerInfo(c.Id))
      );
    } catch (error) {
      this.logger.error({ error }, 'Failed to list containers');
      throw error;
    }
  }

  /**
   * Get container statistics
   */
  async getContainerStats(containerId: string): Promise<{
    cpu: number;
    memory: { usage: number; limit: number; percent: number };
    network: { rx: number; tx: number };
    blockIO: { read: number; write: number };
  }> {
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
          rx: Object.values(stats.networks || {}).reduce((sum: number, n: any) => sum + (n.rx_bytes || 0), 0),
          tx: Object.values(stats.networks || {}).reduce((sum: number, n: any) => sum + (n.tx_bytes || 0), 0)
        },
        blockIO: {
          read: stats.blkio_stats.io_service_bytes_recursive?.find((io: any) => io.op === 'Read')?.value || 0,
          write: stats.blkio_stats.io_service_bytes_recursive?.find((io: any) => io.op === 'Write')?.value || 0
        }
      };
    } catch (error) {
      this.logger.error({ error, containerId }, 'Failed to get container stats');
      throw error;
    }
  }

  /**
   * Format exposed ports for Docker API
   */
  private formatExposedPorts(ports: Array<{ container: number; host?: number }>): Record<string, {}> {
    const exposedPorts: Record<string, {}> = {};
    for (const port of ports) {
      exposedPorts[`${port.container}/tcp`] = {};
    }
    return exposedPorts;
  }

  /**
   * Format port bindings for Docker API
   */
  private formatPortBindings(
    ports: Array<{ container: number; host?: number }>
  ): Record<string, Array<{ HostPort: string }>> {
    const bindings: Record<string, Array<{ HostPort: string }>> = {};
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
  async monitorContainerHealth(containerId: string, interval: number = 30000): Promise<() => void> {
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
      } catch (error) {
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
  async pruneContainers(): Promise<{ containersDeleted: string[]; spaceReclaimed: number }> {
    try {
      const result = await this.docker.pruneContainers();

      this.logger.info(
        { count: result.ContainersDeleted?.length || 0, space: result.SpaceReclaimed },
        'Containers pruned'
      );

      return {
        containersDeleted: result.ContainersDeleted || [],
        spaceReclaimed: result.SpaceReclaimed || 0
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to prune containers');
      throw error;
    }
  }
}
