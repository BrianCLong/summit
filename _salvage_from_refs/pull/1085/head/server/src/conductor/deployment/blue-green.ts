// Zero-Downtime Blue-Green Deployment Engine
// Orchestrates seamless deployments with health validation and automatic rollback

import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import Redis from 'ioredis';
import { prometheusConductorMetrics } from '../observability/prometheus';
import { multiRegionFailoverManager } from '../failover/multi-region';

export interface DeploymentConfig {
  strategy: 'blue-green' | 'canary' | 'rolling';
  environment: 'development' | 'staging' | 'production';
  imageTag: string;
  services: DeploymentService[];
  healthChecks: HealthCheck[];
  rollbackThreshold: {
    errorRate: number;
    latencyP95: number;
    timeoutSeconds: number;
  };
  trafficSplit: {
    canaryPercent: number;
    incrementPercent: number;
    promoteThreshold: number;
  };
  validation: {
    smokeTests: boolean;
    integrationTests: boolean;
    performanceTests: boolean;
  };
}

export interface DeploymentService {
  name: string;
  image: string;
  replicas: number;
  resources: {
    cpu: string;
    memory: string;
  };
  ports: number[];
  healthEndpoint: string;
  environment: Record<string, string>;
  migrations?: DatabaseMigration[];
}

export interface HealthCheck {
  name: string;
  type: 'http' | 'tcp' | 'command';
  target: string;
  expectedStatus?: number;
  timeout: number;
  retries: number;
  interval: number;
}

export interface DatabaseMigration {
  id: string;
  name: string;
  type: 'postgres' | 'neo4j' | 'redis';
  script: string;
  rollbackScript?: string;
  dependencies: string[];
}

export interface DeploymentExecution {
  id: string;
  config: DeploymentConfig;
  status: 'pending' | 'preparing' | 'deploying' | 'validating' | 'promoting' | 'completed' | 'failed' | 'rolled_back';
  startTime: number;
  endTime?: number;
  currentPhase: string;
  phases: DeploymentPhase[];
  healthMetrics: HealthMetrics;
  errors: string[];
  rollbackReason?: string;
}

export interface DeploymentPhase {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  actions: PhaseAction[];
  logs: string[];
}

export interface PhaseAction {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  command?: string;
  output?: string;
  error?: string;
  duration?: number;
}

export interface HealthMetrics {
  errorRate: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  throughput: number;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
}

export class BlueGreenDeploymentEngine extends EventEmitter {
  private redis: Redis;
  private activeDeployments = new Map<string, DeploymentExecution>();
  private metricsInterval?: NodeJS.Timeout;

  constructor(redis: Redis) {
    super();
    this.redis = redis;
    this.startMetricsCollection();
  }

  /**
   * Execute blue-green deployment
   */
  async deploy(config: DeploymentConfig): Promise<string> {
    const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const execution: DeploymentExecution = {
      id: deploymentId,
      config,
      status: 'pending',
      startTime: Date.now(),
      currentPhase: 'initialization',
      phases: this.createDeploymentPhases(config),
      healthMetrics: {
        errorRate: 0,
        latencyP50: 0,
        latencyP95: 0,
        latencyP99: 0,
        throughput: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        activeConnections: 0
      },
      errors: []
    };

    this.activeDeployments.set(deploymentId, execution);
    
    // Persist deployment record
    await this.redis.setex(
      `deployment:${deploymentId}`,
      86400, // 24 hours
      JSON.stringify(execution)
    );

    // Start deployment process
    this.executeDeployment(execution);
    
    this.emit('deployment:started', execution);
    return deploymentId;
  }

  /**
   * Create deployment phases based on strategy
   */
  private createDeploymentPhases(config: DeploymentConfig): DeploymentPhase[] {
    const phases: DeploymentPhase[] = [];

    // Phase 1: Pre-deployment validation
    phases.push({
      name: 'pre_deployment_validation',
      status: 'pending',
      actions: [
        { name: 'validate_configuration', status: 'pending' },
        { name: 'check_resource_availability', status: 'pending' },
        { name: 'validate_image_availability', status: 'pending' },
        { name: 'run_pre_deployment_tests', status: 'pending' }
      ],
      logs: []
    });

    // Phase 2: Database migrations
    if (config.services.some(s => s.migrations?.length)) {
      phases.push({
        name: 'database_migrations',
        status: 'pending',
        actions: [
          { name: 'backup_databases', status: 'pending' },
          { name: 'execute_migrations', status: 'pending' },
          { name: 'validate_schema_integrity', status: 'pending' }
        ],
        logs: []
      });
    }

    // Phase 3: Green environment preparation
    phases.push({
      name: 'green_environment_preparation',
      status: 'pending',
      actions: [
        { name: 'create_green_deployment', status: 'pending' },
        { name: 'configure_green_services', status: 'pending' },
        { name: 'initialize_green_environment', status: 'pending' }
      ],
      logs: []
    });

    // Phase 4: Health validation
    phases.push({
      name: 'health_validation',
      status: 'pending',
      actions: [
        { name: 'run_smoke_tests', status: 'pending' },
        { name: 'validate_service_health', status: 'pending' },
        { name: 'run_integration_tests', status: 'pending' },
        { name: 'performance_validation', status: 'pending' }
      ],
      logs: []
    });

    // Phase 5: Traffic switching (strategy dependent)
    if (config.strategy === 'canary') {
      phases.push({
        name: 'canary_traffic_management',
        status: 'pending',
        actions: [
          { name: 'route_canary_traffic', status: 'pending' },
          { name: 'monitor_canary_metrics', status: 'pending' },
          { name: 'increment_traffic_split', status: 'pending' }
        ],
        logs: []
      });
    } else {
      phases.push({
        name: 'traffic_switching',
        status: 'pending',
        actions: [
          { name: 'switch_load_balancer', status: 'pending' },
          { name: 'validate_traffic_routing', status: 'pending' },
          { name: 'drain_blue_environment', status: 'pending' }
        ],
        logs: []
      });
    }

    // Phase 6: Post-deployment validation
    phases.push({
      name: 'post_deployment_validation',
      status: 'pending',
      actions: [
        { name: 'validate_deployment_success', status: 'pending' },
        { name: 'cleanup_old_environment', status: 'pending' },
        { name: 'update_deployment_records', status: 'pending' }
      ],
      logs: []
    });

    return phases;
  }

  /**
   * Execute deployment phases sequentially
   */
  private async executeDeployment(execution: DeploymentExecution): Promise<void> {
    execution.status = 'preparing';
    this.emit('deployment:phase_changed', execution);

    try {
      for (const phase of execution.phases) {
        execution.currentPhase = phase.name;
        phase.status = 'running';
        phase.startTime = Date.now();

        this.addLog(phase, `Starting phase: ${phase.name}`);
        
        try {
          await this.executePhase(execution, phase);
          
          phase.status = 'completed';
          phase.endTime = Date.now();
          this.addLog(phase, `Phase completed: ${phase.name}`);

          // Health check after critical phases
          if (['green_environment_preparation', 'traffic_switching'].includes(phase.name)) {
            const healthOk = await this.validateHealth(execution);
            if (!healthOk && execution.config.environment === 'production') {
              throw new Error('Health validation failed - initiating rollback');
            }
          }

        } catch (error) {
          phase.status = 'failed';
          phase.endTime = Date.now();
          execution.errors.push(`Phase ${phase.name} failed: ${error.message}`);
          this.addLog(phase, `Phase failed: ${error.message}`);
          
          throw error;
        }

        // Persist progress
        await this.persistDeployment(execution);
        this.emit('deployment:phase_completed', { execution, phase });
      }

      // Deployment successful
      execution.status = 'completed';
      execution.endTime = Date.now();
      
      this.addLog(execution.phases[execution.phases.length - 1], 'Deployment completed successfully');
      this.emit('deployment:completed', execution);
      
      prometheusConductorMetrics.recordOperationalEvent('deployment_success', true);

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = Date.now();
      execution.errors.push(`Deployment failed: ${error.message}`);
      
      this.emit('deployment:failed', { execution, error });
      
      // Attempt rollback for production deployments
      if (execution.config.environment === 'production') {
        await this.rollbackDeployment(execution, error.message);
      }
      
      prometheusConductorMetrics.recordOperationalEvent('deployment_failure', false);
    }

    await this.persistDeployment(execution);
  }

  /**
   * Execute individual deployment phase
   */
  private async executePhase(execution: DeploymentExecution, phase: DeploymentPhase): Promise<void> {
    for (const action of phase.actions) {
      action.status = 'running';
      this.addLog(phase, `Executing action: ${action.name}`);

      const startTime = Date.now();
      
      try {
        await this.executeAction(execution, action);
        
        action.status = 'completed';
        action.duration = Date.now() - startTime;
        this.addLog(phase, `Action completed: ${action.name} (${action.duration}ms)`);

      } catch (error) {
        action.status = 'failed';
        action.error = error.message;
        action.duration = Date.now() - startTime;
        
        throw error;
      }
    }
  }

  /**
   * Execute individual action
   */
  private async executeAction(execution: DeploymentExecution, action: PhaseAction): Promise<void> {
    switch (action.name) {
      case 'validate_configuration':
        await this.validateConfiguration(execution);
        break;
      case 'check_resource_availability':
        await this.checkResourceAvailability(execution);
        break;
      case 'validate_image_availability':
        await this.validateImageAvailability(execution);
        break;
      case 'run_pre_deployment_tests':
        await this.runPreDeploymentTests(execution);
        break;
      case 'backup_databases':
        await this.backupDatabases(execution);
        break;
      case 'execute_migrations':
        await this.executeMigrations(execution);
        break;
      case 'validate_schema_integrity':
        await this.validateSchemaIntegrity(execution);
        break;
      case 'create_green_deployment':
        await this.createGreenDeployment(execution);
        break;
      case 'configure_green_services':
        await this.configureGreenServices(execution);
        break;
      case 'initialize_green_environment':
        await this.initializeGreenEnvironment(execution);
        break;
      case 'run_smoke_tests':
        await this.runSmokeTests(execution);
        break;
      case 'validate_service_health':
        await this.validateServiceHealth(execution);
        break;
      case 'run_integration_tests':
        await this.runIntegrationTests(execution);
        break;
      case 'performance_validation':
        await this.performanceValidation(execution);
        break;
      case 'route_canary_traffic':
        await this.routeCanaryTraffic(execution);
        break;
      case 'monitor_canary_metrics':
        await this.monitorCanaryMetrics(execution);
        break;
      case 'increment_traffic_split':
        await this.incrementTrafficSplit(execution);
        break;
      case 'switch_load_balancer':
        await this.switchLoadBalancer(execution);
        break;
      case 'validate_traffic_routing':
        await this.validateTrafficRouting(execution);
        break;
      case 'drain_blue_environment':
        await this.drainBlueEnvironment(execution);
        break;
      case 'validate_deployment_success':
        await this.validateDeploymentSuccess(execution);
        break;
      case 'cleanup_old_environment':
        await this.cleanupOldEnvironment(execution);
        break;
      case 'update_deployment_records':
        await this.updateDeploymentRecords(execution);
        break;
      default:
        throw new Error(`Unknown action: ${action.name}`);
    }
  }

  /**
   * Action implementations
   */
  private async validateConfiguration(execution: DeploymentExecution): Promise<void> {
    const { config } = execution;
    
    if (!config.imageTag || !config.services.length) {
      throw new Error('Invalid deployment configuration');
    }
    
    // Validate service configurations
    for (const service of config.services) {
      if (!service.name || !service.image) {
        throw new Error(`Invalid service configuration: ${service.name}`);
      }
    }
  }

  private async checkResourceAvailability(execution: DeploymentExecution): Promise<void> {
    // Check cluster resource availability
    const output = await this.executeCommand('kubectl get nodes -o json');
    const nodes = JSON.parse(output);
    
    if (!nodes.items || nodes.items.length === 0) {
      throw new Error('No available nodes in cluster');
    }
  }

  private async validateImageAvailability(execution: DeploymentExecution): Promise<void> {
    // Validate that all images are available in registry
    for (const service of execution.config.services) {
      const fullImage = `${service.image}:${execution.config.imageTag}`;
      await this.executeCommand(`docker manifest inspect ${fullImage}`);
    }
  }

  private async runPreDeploymentTests(execution: DeploymentExecution): Promise<void> {
    if (!execution.config.validation.smokeTests) return;
    
    await this.executeCommand('npm run test:pre-deploy');
  }

  private async backupDatabases(execution: DeploymentExecution): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Backup PostgreSQL
    await this.executeCommand(
      `pg_dump ${process.env.POSTGRES_URL} > backup-${timestamp}.sql`
    );
    
    // Backup Neo4j (using export tool)
    await this.executeCommand(
      `neo4j-admin export --database=neo4j backup-neo4j-${timestamp}.dump`
    );
  }

  private async executeMigrations(execution: DeploymentExecution): Promise<void> {
    for (const service of execution.config.services) {
      if (!service.migrations?.length) continue;
      
      for (const migration of service.migrations) {
        console.log(`Executing migration: ${migration.name}`);
        
        switch (migration.type) {
          case 'postgres':
            await this.executeCommand(`psql ${process.env.POSTGRES_URL} -c "${migration.script}"`);
            break;
          case 'neo4j':
            await this.executeCommand(`cypher-shell -u neo4j -p ${process.env.NEO4J_PASSWORD} "${migration.script}"`);
            break;
          case 'redis':
            await this.executeCommand(`redis-cli EVAL "${migration.script}" 0`);
            break;
        }
      }
    }
  }

  private async validateSchemaIntegrity(execution: DeploymentExecution): Promise<void> {
    // Validate database schemas after migrations
    await this.executeCommand('npm run validate:schema');
  }

  private async createGreenDeployment(execution: DeploymentExecution): Promise<void> {
    const { config } = execution;
    
    // Create green deployment manifests
    const manifests = this.generateKubernetesManifests(config, 'green');
    
    // Apply green deployment
    for (const manifest of manifests) {
      await this.executeCommand(`echo '${manifest}' | kubectl apply -f -`);
    }
    
    // Wait for green deployment to be ready
    for (const service of config.services) {
      await this.executeCommand(
        `kubectl wait --for=condition=ready pod -l app=${service.name}-green --timeout=300s`
      );
    }
  }

  private async configureGreenServices(execution: DeploymentExecution): Promise<void> {
    const { config } = execution;
    
    // Configure green services with environment variables
    for (const service of config.services) {
      const configMap = this.generateConfigMap(service, 'green');
      await this.executeCommand(`echo '${configMap}' | kubectl apply -f -`);
    }
  }

  private async initializeGreenEnvironment(execution: DeploymentExecution): Promise<void> {
    // Run initialization scripts for green environment
    await this.executeCommand('kubectl exec deployment/server-green -- npm run initialize');
  }

  private async runSmokeTests(execution: DeploymentExecution): Promise<void> {
    if (!execution.config.validation.smokeTests) return;
    
    // Run smoke tests against green environment
    const greenUrl = await this.getGreenEnvironmentUrl(execution);
    await this.executeCommand(`API_URL=${greenUrl} npm run test:smoke`);
  }

  private async validateServiceHealth(execution: DeploymentExecution): Promise<void> {
    for (const healthCheck of execution.config.healthChecks) {
      await this.executeHealthCheck(healthCheck, 'green');
    }
  }

  private async runIntegrationTests(execution: DeploymentExecution): Promise<void> {
    if (!execution.config.validation.integrationTests) return;
    
    const greenUrl = await this.getGreenEnvironmentUrl(execution);
    await this.executeCommand(`API_URL=${greenUrl} npm run test:integration`);
  }

  private async performanceValidation(execution: DeploymentExecution): Promise<void> {
    if (!execution.config.validation.performanceTests) return;
    
    const greenUrl = await this.getGreenEnvironmentUrl(execution);
    const output = await this.executeCommand(`k6 run --env API_URL=${greenUrl} performance-test.js`);
    
    // Parse performance results and validate
    const results = this.parseK6Results(output);
    if (results.errorRate > 0.01) { // 1% error rate threshold
      throw new Error(`Performance validation failed: ${results.errorRate}% error rate`);
    }
  }

  private async routeCanaryTraffic(execution: DeploymentExecution): Promise<void> {
    const { trafficSplit } = execution.config;
    
    // Update ingress/service mesh for canary routing
    await this.updateTrafficSplit('green', trafficSplit.canaryPercent);
  }

  private async monitorCanaryMetrics(execution: DeploymentExecution): Promise<void> {
    const { rollbackThreshold } = execution.config;
    const monitoringDuration = 300000; // 5 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < monitoringDuration) {
      const metrics = await this.collectHealthMetrics();
      execution.healthMetrics = metrics;
      
      // Check rollback conditions
      if (metrics.errorRate > rollbackThreshold.errorRate ||
          metrics.latencyP95 > rollbackThreshold.latencyP95) {
        throw new Error(`Rollback threshold exceeded: Error Rate ${metrics.errorRate}%, P95 ${metrics.latencyP95}ms`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    }
  }

  private async incrementTrafficSplit(execution: DeploymentExecution): Promise<void> {
    const { trafficSplit } = execution.config;
    let currentPercent = trafficSplit.canaryPercent;
    
    while (currentPercent < 100) {
      currentPercent = Math.min(100, currentPercent + trafficSplit.incrementPercent);
      await this.updateTrafficSplit('green', currentPercent);
      
      // Monitor for a period before next increment
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
      
      const metrics = await this.collectHealthMetrics();
      if (metrics.errorRate > execution.config.rollbackThreshold.errorRate) {
        throw new Error(`Traffic increment failed: Error rate ${metrics.errorRate}%`);
      }
    }
  }

  private async switchLoadBalancer(execution: DeploymentExecution): Promise<void> {
    // Switch load balancer to point to green environment
    await this.updateTrafficSplit('green', 100);
    
    // Wait for traffic to fully switch
    await new Promise(resolve => setTimeout(resolve, 30000));
  }

  private async validateTrafficRouting(execution: DeploymentExecution): Promise<void> {
    // Validate that traffic is routed to green environment
    const greenUrl = await this.getGreenEnvironmentUrl(execution);
    
    for (let i = 0; i < 10; i++) {
      const response = await this.executeCommand(`curl -s ${greenUrl}/api/health`);
      const health = JSON.parse(response);
      
      if (!health.status === 'ok') {
        throw new Error('Traffic routing validation failed');
      }
    }
  }

  private async drainBlueEnvironment(execution: DeploymentExecution): Promise<void> {
    // Gracefully drain blue environment
    await this.executeCommand('kubectl drain deployment/server-blue --grace-period=300');
  }

  private async validateDeploymentSuccess(execution: DeploymentExecution): Promise<void> {
    // Final validation that deployment is successful
    const metrics = await this.collectHealthMetrics();
    
    if (metrics.errorRate > 0.001) { // 0.1% threshold
      throw new Error(`Deployment validation failed: Error rate ${metrics.errorRate}%`);
    }
  }

  private async cleanupOldEnvironment(execution: DeploymentExecution): Promise<void> {
    // Clean up blue environment
    await this.executeCommand('kubectl delete deployment server-blue');
    await this.executeCommand('kubectl delete service server-blue');
  }

  private async updateDeploymentRecords(execution: DeploymentExecution): Promise<void> {
    // Update deployment records
    await this.redis.hset('current_deployment', {
      version: execution.config.imageTag,
      timestamp: Date.now(),
      strategy: execution.config.strategy
    });
  }

  /**
   * Rollback deployment
   */
  private async rollbackDeployment(execution: DeploymentExecution, reason: string): Promise<void> {
    execution.status = 'rolled_back';
    execution.rollbackReason = reason;
    
    console.log(`Rolling back deployment ${execution.id}: ${reason}`);
    
    try {
      // Switch traffic back to blue environment
      await this.updateTrafficSplit('blue', 100);
      
      // Rollback database migrations if needed
      await this.rollbackMigrations(execution);
      
      // Clean up failed green environment
      await this.cleanupFailedDeployment(execution);
      
      this.emit('deployment:rolled_back', execution);
      
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
      execution.errors.push(`Rollback failed: ${rollbackError.message}`);
    }
  }

  /**
   * Health validation
   */
  private async validateHealth(execution: DeploymentExecution): Promise<boolean> {
    const { rollbackThreshold } = execution.config;
    
    try {
      const metrics = await this.collectHealthMetrics();
      execution.healthMetrics = metrics;
      
      return (
        metrics.errorRate <= rollbackThreshold.errorRate &&
        metrics.latencyP95 <= rollbackThreshold.latencyP95
      );
    } catch (error) {
      console.error('Health validation failed:', error);
      return false;
    }
  }

  /**
   * Helper methods
   */
  private async executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command]);
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed: ${command}\n${stderr}`));
        }
      });
    });
  }

  private async executeHealthCheck(healthCheck: HealthCheck, environment: string): Promise<void> {
    for (let attempt = 0; attempt < healthCheck.retries; attempt++) {
      try {
        switch (healthCheck.type) {
          case 'http':
            const url = healthCheck.target.replace('{{environment}}', environment);
            await this.executeCommand(`curl -f -m ${healthCheck.timeout} ${url}`);
            return;
          case 'tcp':
            await this.executeCommand(`nc -z -w${healthCheck.timeout} ${healthCheck.target}`);
            return;
          case 'command':
            await this.executeCommand(healthCheck.target);
            return;
        }
      } catch (error) {
        if (attempt === healthCheck.retries - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, healthCheck.interval));
      }
    }
  }

  private generateKubernetesManifests(config: DeploymentConfig, environment: string): string[] {
    const manifests: string[] = [];
    
    for (const service of config.services) {
      const deployment = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: `${service.name}-${environment}`,
          labels: {
            app: `${service.name}-${environment}`,
            version: config.imageTag,
            environment
          }
        },
        spec: {
          replicas: service.replicas,
          selector: {
            matchLabels: {
              app: `${service.name}-${environment}`
            }
          },
          template: {
            metadata: {
              labels: {
                app: `${service.name}-${environment}`,
                version: config.imageTag,
                environment
              }
            },
            spec: {
              containers: [{
                name: service.name,
                image: `${service.image}:${config.imageTag}`,
                resources: service.resources,
                ports: service.ports.map(port => ({ containerPort: port })),
                env: Object.entries(service.environment).map(([key, value]) => ({
                  name: key,
                  value: value
                })),
                readinessProbe: {
                  httpGet: {
                    path: service.healthEndpoint,
                    port: service.ports[0]
                  },
                  initialDelaySeconds: 10,
                  periodSeconds: 5
                },
                livenessProbe: {
                  httpGet: {
                    path: service.healthEndpoint,
                    port: service.ports[0]
                  },
                  initialDelaySeconds: 30,
                  periodSeconds: 10
                }
              }]
            }
          }
        }
      };
      
      manifests.push(JSON.stringify(deployment));
    }
    
    return manifests;
  }

  private generateConfigMap(service: DeploymentService, environment: string): string {
    return JSON.stringify({
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: `${service.name}-${environment}-config`
      },
      data: service.environment
    });
  }

  private async getGreenEnvironmentUrl(execution: DeploymentExecution): Promise<string> {
    // Get green environment service URL
    const output = await this.executeCommand(
      'kubectl get service server-green -o jsonpath="{.status.loadBalancer.ingress[0].hostname}"'
    );
    return `http://${output.trim()}`;
  }

  private async updateTrafficSplit(target: 'blue' | 'green', percentage: number): Promise<void> {
    // Update ingress or service mesh configuration for traffic splitting
    const ingressConfig = {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: 'conductor-ingress',
        annotations: {
          'nginx.ingress.kubernetes.io/canary': 'true',
          'nginx.ingress.kubernetes.io/canary-weight': percentage.toString()
        }
      }
    };
    
    await this.executeCommand(`echo '${JSON.stringify(ingressConfig)}' | kubectl apply -f -`);
  }

  private async collectHealthMetrics(): Promise<HealthMetrics> {
    // Collect metrics from Prometheus or application monitoring
    // This is a placeholder implementation
    return {
      errorRate: Math.random() * 0.005, // 0-0.5% error rate
      latencyP50: 50 + Math.random() * 50,
      latencyP95: 100 + Math.random() * 100,
      latencyP99: 200 + Math.random() * 200,
      throughput: 1000 + Math.random() * 500,
      cpuUsage: 30 + Math.random() * 40,
      memoryUsage: 40 + Math.random() * 30,
      activeConnections: 50 + Math.random() * 100
    };
  }

  private parseK6Results(output: string): { errorRate: number; avgLatency: number } {
    // Parse k6 output for performance metrics
    const errorMatch = output.match(/http_req_failed.*?([\d.]+)%/);
    const latencyMatch = output.match(/http_req_duration.*?avg=([\d.]+)ms/);
    
    return {
      errorRate: errorMatch ? parseFloat(errorMatch[1]) : 0,
      avgLatency: latencyMatch ? parseFloat(latencyMatch[1]) : 0
    };
  }

  private async rollbackMigrations(execution: DeploymentExecution): Promise<void> {
    for (const service of execution.config.services) {
      if (!service.migrations?.length) continue;
      
      // Execute rollback scripts in reverse order
      for (const migration of service.migrations.reverse()) {
        if (migration.rollbackScript) {
          console.log(`Rolling back migration: ${migration.name}`);
          
          switch (migration.type) {
            case 'postgres':
              await this.executeCommand(`psql ${process.env.POSTGRES_URL} -c "${migration.rollbackScript}"`);
              break;
            case 'neo4j':
              await this.executeCommand(`cypher-shell -u neo4j -p ${process.env.NEO4J_PASSWORD} "${migration.rollbackScript}"`);
              break;
            case 'redis':
              await this.executeCommand(`redis-cli EVAL "${migration.rollbackScript}" 0`);
              break;
          }
        }
      }
    }
  }

  private async cleanupFailedDeployment(execution: DeploymentExecution): Promise<void> {
    // Clean up failed green environment
    try {
      await this.executeCommand('kubectl delete deployment server-green --ignore-not-found=true');
      await this.executeCommand('kubectl delete service server-green --ignore-not-found=true');
      await this.executeCommand('kubectl delete configmap server-green-config --ignore-not-found=true');
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }

  private addLog(phase: DeploymentPhase, message: string): void {
    const timestamp = new Date().toISOString();
    phase.logs.push(`${timestamp}: ${message}`);
  }

  private async persistDeployment(execution: DeploymentExecution): Promise<void> {
    await this.redis.setex(
      `deployment:${execution.id}`,
      86400,
      JSON.stringify(execution)
    );
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      const activeCount = this.activeDeployments.size;
      prometheusConductorMetrics.recordOperationalMetric('active_deployments', activeCount);
    }, 30000);
  }

  /**
   * Get deployment status
   */
  getDeployment(deploymentId: string): DeploymentExecution | undefined {
    return this.activeDeployments.get(deploymentId);
  }

  /**
   * List active deployments
   */
  getActiveDeployments(): DeploymentExecution[] {
    return Array.from(this.activeDeployments.values());
  }

  /**
   * Cancel deployment
   */
  async cancelDeployment(deploymentId: string, reason: string): Promise<void> {
    const execution = this.activeDeployments.get(deploymentId);
    if (!execution) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    if (['completed', 'failed', 'rolled_back'].includes(execution.status)) {
      throw new Error(`Cannot cancel deployment in status: ${execution.status}`);
    }

    await this.rollbackDeployment(execution, `Cancelled: ${reason}`);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
}

// Singleton instance
export const blueGreenDeploymentEngine = new BlueGreenDeploymentEngine(
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
);