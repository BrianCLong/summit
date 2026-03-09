/**
 * @fileoverview Chaos Experiment Library
 * Pre-built chaos experiments for common failure scenarios
 * with detailed configuration and best practices.
 */

import {
  ChaosEngine,
  ChaosExperiment,
  ChaosExperimentType,
} from '../core/ChaosEngine.js';

/**
 * Library of pre-built chaos experiments
 */
export class ChaosExperimentLibrary {
  /**
   * Network partition experiments
   */
  static networkPartition = {
    /**
     * Isolate service from network
     */
    serviceIsolation: (config: {
      serviceName: string;
      duration: number;
      namespace?: string;
      environment: string;
    }): ChaosExperiment => ({
      id: `network_isolation_${config.serviceName}_${Date.now()}`,
      name: `Network Isolation - ${config.serviceName}`,
      description: `Isolate ${config.serviceName} from network to test service dependencies`,
      type: 'network_partition',
      target: 'service',
      hypothesis: `${config.serviceName} dependencies should handle network isolation gracefully without cascading failures`,
      blastRadius: 'service',
      configuration: {
        duration: config.duration,
        tolerance: 15, // 15% degradation acceptable
        parallel: false,
        dryRun: false,
        environment: config.environment,
        targets: [
          {
            name: config.serviceName,
            type: 'service',
            selector: {
              type: 'label',
              criteria: {
                'app.kubernetes.io/name': config.serviceName,
                ...(config.namespace && { namespace: config.namespace }),
              },
            },
            configuration: {
              isolationType: 'complete',
              direction: 'both',
            },
          },
        ],
        parameters: {
          action: 'isolate',
          duration: config.duration,
        },
        safeguards: [
          {
            name: 'emergency_stop',
            type: 'circuit_breaker',
            configuration: {
              error_threshold: 50,
              response_time_threshold: 5000,
            },
            enabled: true,
          },
        ],
      },
      steadyState: {
        title: 'Service ecosystem is healthy',
        description: 'All dependent services maintain acceptable performance',
        probes: [
          {
            name: 'api_gateway_health',
            type: 'http',
            configuration: {
              url: `https://api.${config.environment}.intelgraph.io/health`,
              expectedStatus: [200],
              timeout: 10,
            },
            tolerance: { exact: 200 },
            frequency: 5,
            timeout: 10,
            retries: 3,
          },
          {
            name: 'database_connectivity',
            type: 'tcp',
            configuration: {
              host: `db.${config.environment}.intelgraph.io`,
              port: 5432,
              timeout: 5,
            },
            tolerance: { custom: (result) => result.connected === true },
            frequency: 10,
            timeout: 5,
            retries: 2,
          },
          {
            name: 'dependent_services_health',
            type: 'custom',
            configuration: {
              customProbe: async () => {
                // Check health of services that depend on the isolated service
                return { healthy_services: 8, total_services: 10 };
              },
            },
            tolerance: {
              custom: (result) => result.healthy_services >= 7, // 70% services healthy
            },
            frequency: 15,
            timeout: 30,
            retries: 1,
          },
        ],
        tolerance: {
          failureThreshold: 20, // 20% of probes can fail
          responseTimeThreshold: 3000,
          errorRateThreshold: 5,
          customTolerances: [],
        },
      },
      method: [
        {
          name: 'isolate_service_network',
          type: 'action',
          provider: 'kubernetes',
          module: 'networking',
          function: 'isolate_pod',
          arguments: {
            label_selector: `app.kubernetes.io/name=${config.serviceName}`,
            namespace: config.namespace || 'default',
            isolation_type: 'network',
            duration: config.duration,
          },
          configuration: {
            timeout: 60,
            retries: 3,
            background: true,
            continueOnFailure: false,
            rollbackOnFailure: true,
          },
          pauses: {
            before: 30,
            after: 15,
          },
        },
      ],
      rollback: {
        enabled: true,
        automatic: true,
        conditions: [
          {
            type: 'steady_state_violation',
            threshold: 30,
          },
          {
            type: 'error_threshold',
            threshold: 25,
            duration: 60,
          },
        ],
        methods: [
          {
            name: 'restore_service_network',
            type: 'action',
            provider: 'kubernetes',
            module: 'networking',
            function: 'restore_pod_network',
            arguments: {
              label_selector: `app.kubernetes.io/name=${config.serviceName}`,
              namespace: config.namespace || 'default',
            },
            configuration: {
              timeout: 30,
              retries: 5,
              background: false,
              continueOnFailure: false,
              rollbackOnFailure: false,
            },
          },
        ],
        timeout: 120,
      },
      monitoring: {
        enabled: true,
        metrics: [
          {
            name: 'service_response_time',
            source: 'prometheus',
            query: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="${config.serviceName}"}[5m]))`,
            aggregation: 'avg',
            threshold: { warning: 1.0, critical: 3.0 },
          },
          {
            name: 'service_error_rate',
            source: 'prometheus',
            query: `rate(http_requests_total{service="${config.serviceName}",status=~"5.."}[5m])`,
            aggregation: 'avg',
            threshold: { warning: 0.01, critical: 0.05 },
          },
          {
            name: 'dependent_services_health',
            source: 'custom',
            query:
              'SELECT COUNT(*) FROM services WHERE health_status = "healthy"',
            aggregation: 'count',
            threshold: { warning: 8, critical: 6 },
          },
        ],
        alerts: [
          {
            name: 'cascade_failure_detected',
            condition: 'dependent_services_health < 6',
            severity: 'critical',
            channels: ['pagerduty', 'slack-critical'],
            suppressDuration: 10,
          },
        ],
        dashboards: ['chaos-experiments', 'service-health'],
        notifications: [
          {
            type: 'slack',
            configuration: {
              webhook_url: '${SLACK_WEBHOOK_URL}',
              channel: '#sre-alerts',
            },
            events: [
              'experiment_started',
              'experiment_failed',
              'rollback_triggered',
            ],
          },
        ],
      },
      metadata: {
        author: 'sre-team',
        team: 'reliability',
        environment: config.environment,
        tags: ['network', 'isolation', 'dependency', 'resilience'],
        createdAt: new Date(),
        version: '2.1.0',
        riskLevel: 'high',
      },
    }),

    /**
     * Network latency injection
     */
    latencyInjection: (config: {
      targetService: string;
      latencyMs: number;
      jitterMs: number;
      duration: number;
      environment: string;
    }): ChaosExperiment => ({
      id: `network_latency_${config.targetService}_${Date.now()}`,
      name: `Network Latency Injection - ${config.targetService}`,
      description: `Inject ${config.latencyMs}ms latency into ${config.targetService} network traffic`,
      type: 'network_partition',
      target: 'network',
      hypothesis: `System should handle ${config.latencyMs}ms network latency gracefully`,
      blastRadius: 'service',
      configuration: {
        duration: config.duration,
        tolerance: 20,
        parallel: false,
        dryRun: false,
        environment: config.environment,
        targets: [
          {
            name: config.targetService,
            type: 'network',
            selector: {
              type: 'label',
              criteria: { service: config.targetService },
            },
            configuration: {
              latency: config.latencyMs,
              jitter: config.jitterMs,
              distribution: 'normal',
            },
          },
        ],
        parameters: {
          delay: config.latencyMs,
          jitter: config.jitterMs,
          duration: config.duration,
        },
        safeguards: [
          {
            name: 'latency_limit',
            type: 'resource_limit',
            configuration: { max_latency: 10000 },
            enabled: true,
          },
        ],
      },
      steadyState: {
        title: 'System performance within acceptable bounds',
        description: 'Response times and throughput remain acceptable',
        probes: [
          {
            name: 'api_response_time',
            type: 'http',
            configuration: {
              url: 'https://api.intelgraph.io/v1/health',
              expectedStatus: [200],
              timeout: 15,
            },
            tolerance: {
              custom: (result) => result.responseTime < 5000,
            },
            frequency: 10,
            timeout: 15,
            retries: 2,
          },
        ],
        tolerance: {
          failureThreshold: 10,
          responseTimeThreshold: 5000,
          errorRateThreshold: 2,
          customTolerances: [],
        },
      },
      method: [
        {
          name: 'inject_network_latency',
          type: 'action',
          provider: 'network',
          module: 'netem',
          function: 'add_delay',
          arguments: {
            interface: 'eth0',
            delay: `${config.latencyMs}ms`,
            jitter: `${config.jitterMs}ms`,
            distribution: 'normal',
          },
          configuration: {
            timeout: 30,
            retries: 3,
            background: true,
            continueOnFailure: false,
            rollbackOnFailure: true,
          },
        },
      ],
      rollback: {
        enabled: true,
        automatic: true,
        conditions: [
          {
            type: 'steady_state_violation',
            threshold: 25,
          },
        ],
        methods: [
          {
            name: 'remove_network_latency',
            type: 'action',
            provider: 'network',
            module: 'netem',
            function: 'clear_delay',
            arguments: {
              interface: 'eth0',
            },
            configuration: {
              timeout: 30,
              retries: 5,
              background: false,
              continueOnFailure: false,
              rollbackOnFailure: false,
            },
          },
        ],
        timeout: 60,
      },
      monitoring: {
        enabled: true,
        metrics: [
          {
            name: 'network_latency',
            source: 'prometheus',
            query:
              'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
            aggregation: 'avg',
            threshold: { warning: 2.0, critical: 5.0 },
          },
        ],
        alerts: [],
        dashboards: ['network-performance'],
        notifications: [],
      },
      metadata: {
        author: 'network-team',
        team: 'infrastructure',
        environment: config.environment,
        tags: ['network', 'latency', 'performance'],
        createdAt: new Date(),
        version: '1.5.0',
        riskLevel: 'medium',
      },
    }),

    /**
     * Packet loss simulation
     */
    packetLoss: (config: {
      targetService: string;
      lossPercentage: number;
      duration: number;
      environment: string;
    }): ChaosExperiment => ({
      id: `packet_loss_${config.targetService}_${Date.now()}`,
      name: `Packet Loss - ${config.targetService}`,
      description: `Simulate ${config.lossPercentage}% packet loss for ${config.targetService}`,
      type: 'network_partition',
      target: 'network',
      hypothesis: `System should handle ${config.lossPercentage}% packet loss without data corruption`,
      blastRadius: 'service',
      configuration: {
        duration: config.duration,
        tolerance: 25,
        parallel: false,
        dryRun: false,
        environment: config.environment,
        targets: [
          {
            name: config.targetService,
            type: 'network',
            selector: {
              type: 'label',
              criteria: { service: config.targetService },
            },
            configuration: {
              loss_percentage: config.lossPercentage,
              loss_correlation: 25,
            },
          },
        ],
        parameters: {
          loss: config.lossPercentage,
          duration: config.duration,
        },
        safeguards: [
          {
            name: 'packet_loss_limit',
            type: 'resource_limit',
            configuration: { max_loss_percentage: 50 },
            enabled: true,
          },
        ],
      },
      steadyState: {
        title: 'Network communication is reliable',
        description: 'Services maintain connectivity despite packet loss',
        probes: [
          {
            name: 'tcp_connectivity',
            type: 'tcp',
            configuration: {
              host: config.targetService,
              port: 80,
              timeout: 10,
            },
            tolerance: {
              custom: (result) => result.connected === true,
            },
            frequency: 15,
            timeout: 10,
            retries: 3,
          },
        ],
        tolerance: {
          failureThreshold: 30,
          responseTimeThreshold: 10000,
          errorRateThreshold: 10,
          customTolerances: [],
        },
      },
      method: [
        {
          name: 'simulate_packet_loss',
          type: 'action',
          provider: 'network',
          module: 'netem',
          function: 'add_loss',
          arguments: {
            interface: 'eth0',
            loss_percentage: config.lossPercentage,
            loss_correlation: '25%',
          },
          configuration: {
            timeout: 30,
            retries: 3,
            background: true,
            continueOnFailure: false,
            rollbackOnFailure: true,
          },
        },
      ],
      rollback: {
        enabled: true,
        automatic: true,
        conditions: [
          {
            type: 'steady_state_violation',
            threshold: 40,
          },
        ],
        methods: [
          {
            name: 'remove_packet_loss',
            type: 'action',
            provider: 'network',
            module: 'netem',
            function: 'clear_loss',
            arguments: {
              interface: 'eth0',
            },
            configuration: {
              timeout: 30,
              retries: 5,
              background: false,
              continueOnFailure: false,
              rollbackOnFailure: false,
            },
          },
        ],
        timeout: 60,
      },
      monitoring: {
        enabled: true,
        metrics: [
          {
            name: 'packet_loss_rate',
            source: 'prometheus',
            query: 'rate(network_packets_dropped_total[5m])',
            aggregation: 'avg',
          },
        ],
        alerts: [],
        dashboards: ['network-reliability'],
        notifications: [],
      },
      metadata: {
        author: 'network-team',
        team: 'infrastructure',
        environment: config.environment,
        tags: ['network', 'packet-loss', 'reliability'],
        createdAt: new Date(),
        version: '1.3.0',
        riskLevel: 'medium',
      },
    }),
  };

  /**
   * Resource exhaustion experiments
   */
  static resourceExhaustion = {
    /**
     * CPU stress test
     */
    cpuStress: (config: {
      targetService: string;
      cpuPercentage: number;
      duration: number;
      cores?: number;
      environment: string;
    }): ChaosExperiment => ({
      id: `cpu_stress_${config.targetService}_${Date.now()}`,
      name: `CPU Stress - ${config.targetService}`,
      description: `Stress CPU to ${config.cpuPercentage}% on ${config.targetService}`,
      type: 'resource_exhaustion',
      target: 'infrastructure',
      hypothesis: `${config.targetService} should handle ${config.cpuPercentage}% CPU load gracefully`,
      blastRadius: 'single_instance',
      configuration: {
        duration: config.duration,
        tolerance: 30,
        parallel: false,
        dryRun: false,
        environment: config.environment,
        targets: [
          {
            name: config.targetService,
            type: 'infrastructure',
            selector: {
              type: 'label',
              criteria: { service: config.targetService },
            },
            configuration: {
              cpu_percentage: config.cpuPercentage,
              cores: config.cores || 0, // 0 = all cores
              workers: config.cores || 1,
            },
          },
        ],
        parameters: {
          cpu_load: config.cpuPercentage,
          duration: config.duration,
          workers: config.cores,
        },
        safeguards: [
          {
            name: 'cpu_limit',
            type: 'resource_limit',
            configuration: { max_cpu_percentage: 95 },
            enabled: true,
          },
          {
            name: 'thermal_protection',
            type: 'circuit_breaker',
            configuration: { temperature_threshold: 85 },
            enabled: true,
          },
        ],
      },
      steadyState: {
        title: 'System performance is acceptable',
        description: 'Services respond within acceptable time despite CPU load',
        probes: [
          {
            name: 'service_response_time',
            type: 'http',
            configuration: {
              url: `https://${config.targetService}.intelgraph.io/health`,
              expectedStatus: [200],
              timeout: 10,
            },
            tolerance: {
              custom: (result) => result.responseTime < 3000,
            },
            frequency: 10,
            timeout: 10,
            retries: 3,
          },
          {
            name: 'cpu_usage_check',
            type: 'metric',
            configuration: {
              query:
                'cpu_usage_percentage{service="' + config.targetService + '"}',
            },
            tolerance: { max: 98 },
            frequency: 5,
            timeout: 5,
            retries: 1,
          },
        ],
        tolerance: {
          failureThreshold: 20,
          responseTimeThreshold: 5000,
          errorRateThreshold: 5,
          customTolerances: [],
        },
      },
      method: [
        {
          name: 'stress_cpu',
          type: 'action',
          provider: 'system',
          module: 'stress',
          function: 'cpu',
          arguments: {
            workers: config.cores || 1,
            load_percentage: config.cpuPercentage,
            timeout: config.duration,
          },
          configuration: {
            timeout: config.duration + 30,
            retries: 2,
            background: true,
            continueOnFailure: false,
            rollbackOnFailure: true,
          },
        },
      ],
      rollback: {
        enabled: true,
        automatic: true,
        conditions: [
          {
            type: 'steady_state_violation',
            threshold: 35,
          },
          {
            type: 'custom',
            validator: (metrics) => metrics.system.cpu_usage > 98,
          },
        ],
        methods: [
          {
            name: 'stop_cpu_stress',
            type: 'action',
            provider: 'system',
            module: 'stress',
            function: 'stop',
            arguments: {
              signal: 'SIGTERM',
            },
            configuration: {
              timeout: 30,
              retries: 3,
              background: false,
              continueOnFailure: false,
              rollbackOnFailure: false,
            },
          },
        ],
        timeout: 60,
      },
      monitoring: {
        enabled: true,
        metrics: [
          {
            name: 'cpu_utilization',
            source: 'prometheus',
            query: 'rate(cpu_usage_seconds_total[5m]) * 100',
            aggregation: 'avg',
            threshold: { warning: 80, critical: 95 },
          },
          {
            name: 'load_average',
            source: 'prometheus',
            query: 'load_average_5m',
            aggregation: 'avg',
            threshold: { warning: 4, critical: 8 },
          },
        ],
        alerts: [
          {
            name: 'cpu_overload',
            condition: 'cpu_utilization > 95',
            severity: 'critical',
            channels: ['pagerduty'],
            suppressDuration: 2,
          },
        ],
        dashboards: ['resource-monitoring'],
        notifications: [],
      },
      metadata: {
        author: 'performance-team',
        team: 'reliability',
        environment: config.environment,
        tags: ['cpu', 'performance', 'stress-test'],
        createdAt: new Date(),
        version: '2.0.0',
        riskLevel: config.cpuPercentage > 80 ? 'high' : 'medium',
      },
    }),

    /**
     * Memory exhaustion test
     */
    memoryExhaustion: (config: {
      targetService: string;
      memoryMB: number;
      duration: number;
      environment: string;
    }): ChaosExperiment => ({
      id: `memory_exhaustion_${config.targetService}_${Date.now()}`,
      name: `Memory Exhaustion - ${config.targetService}`,
      description: `Consume ${config.memoryMB}MB of memory on ${config.targetService}`,
      type: 'resource_exhaustion',
      target: 'infrastructure',
      hypothesis: `${config.targetService} should handle memory pressure of ${config.memoryMB}MB`,
      blastRadius: 'single_instance',
      configuration: {
        duration: config.duration,
        tolerance: 25,
        parallel: false,
        dryRun: false,
        environment: config.environment,
        targets: [
          {
            name: config.targetService,
            type: 'infrastructure',
            selector: {
              type: 'label',
              criteria: { service: config.targetService },
            },
            configuration: {
              memory_mb: config.memoryMB,
              allocation_pattern: 'linear',
            },
          },
        ],
        parameters: {
          memory_size: config.memoryMB,
          duration: config.duration,
        },
        safeguards: [
          {
            name: 'memory_limit',
            type: 'resource_limit',
            configuration: { max_memory_percentage: 90 },
            enabled: true,
          },
          {
            name: 'oom_protection',
            type: 'circuit_breaker',
            configuration: { swap_threshold: 80 },
            enabled: true,
          },
        ],
      },
      steadyState: {
        title: 'Memory usage is sustainable',
        description: 'System maintains stability without OOM kills',
        probes: [
          {
            name: 'memory_usage_check',
            type: 'metric',
            configuration: {
              query:
                'memory_usage_percentage{service="' +
                config.targetService +
                '"}',
            },
            tolerance: { max: 95 },
            frequency: 5,
            timeout: 5,
            retries: 1,
          },
          {
            name: 'oom_events_check',
            type: 'metric',
            configuration: {
              query:
                'increase(oom_kills_total{service="' +
                config.targetService +
                '"}[1m])',
            },
            tolerance: { max: 0 },
            frequency: 10,
            timeout: 5,
            retries: 1,
          },
        ],
        tolerance: {
          failureThreshold: 15,
          responseTimeThreshold: 4000,
          errorRateThreshold: 3,
          customTolerances: [
            {
              name: 'no_oom_kills',
              validator: (metrics) => metrics.custom.oom_kills === 0,
              critical: true,
            },
          ],
        },
      },
      method: [
        {
          name: 'consume_memory',
          type: 'action',
          provider: 'system',
          module: 'stress',
          function: 'memory',
          arguments: {
            size: `${config.memoryMB}MB`,
            workers: 1,
            timeout: config.duration,
          },
          configuration: {
            timeout: config.duration + 30,
            retries: 2,
            background: true,
            continueOnFailure: false,
            rollbackOnFailure: true,
          },
        },
      ],
      rollback: {
        enabled: true,
        automatic: true,
        conditions: [
          {
            type: 'steady_state_violation',
            threshold: 30,
          },
          {
            type: 'custom',
            validator: (metrics) => metrics.system.memory_usage > 95,
          },
        ],
        methods: [
          {
            name: 'release_memory',
            type: 'action',
            provider: 'system',
            module: 'stress',
            function: 'stop',
            arguments: {
              signal: 'SIGTERM',
            },
            configuration: {
              timeout: 30,
              retries: 3,
              background: false,
              continueOnFailure: false,
              rollbackOnFailure: false,
            },
          },
        ],
        timeout: 60,
      },
      monitoring: {
        enabled: true,
        metrics: [
          {
            name: 'memory_utilization',
            source: 'prometheus',
            query:
              '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100',
            aggregation: 'avg',
            threshold: { warning: 80, critical: 95 },
          },
          {
            name: 'swap_usage',
            source: 'prometheus',
            query:
              '(1 - (node_memory_SwapFree_bytes / node_memory_SwapTotal_bytes)) * 100',
            aggregation: 'avg',
            threshold: { warning: 50, critical: 80 },
          },
        ],
        alerts: [
          {
            name: 'memory_pressure',
            condition: 'memory_utilization > 90',
            severity: 'warning',
            channels: ['slack-alerts'],
            suppressDuration: 5,
          },
          {
            name: 'oom_risk',
            condition: 'memory_utilization > 95 AND swap_usage > 70',
            severity: 'critical',
            channels: ['pagerduty'],
            suppressDuration: 1,
          },
        ],
        dashboards: ['memory-monitoring'],
        notifications: [],
      },
      metadata: {
        author: 'performance-team',
        team: 'reliability',
        environment: config.environment,
        tags: ['memory', 'performance', 'oom', 'stress-test'],
        createdAt: new Date(),
        version: '1.8.0',
        riskLevel: config.memoryMB > 1000 ? 'high' : 'medium',
      },
    }),

    /**
     * Disk I/O stress test
     */
    diskIOStress: (config: {
      targetService: string;
      ioIntensity: 'light' | 'moderate' | 'heavy';
      duration: number;
      filesystem: string;
      environment: string;
    }): ChaosExperiment => {
      const ioSettings = {
        light: { workers: 1, blockSize: '1M', operations: 100 },
        moderate: { workers: 4, blockSize: '4M', operations: 500 },
        heavy: { workers: 8, blockSize: '8M', operations: 1000 },
      };

      const settings = ioSettings[config.ioIntensity];

      return {
        id: `disk_io_stress_${config.targetService}_${Date.now()}`,
        name: `Disk I/O Stress - ${config.targetService}`,
        description: `${config.ioIntensity} disk I/O stress on ${config.targetService}`,
        type: 'resource_exhaustion',
        target: 'infrastructure',
        hypothesis: `${config.targetService} should handle ${config.ioIntensity} disk I/O load`,
        blastRadius: 'single_instance',
        configuration: {
          duration: config.duration,
          tolerance: 35,
          parallel: false,
          dryRun: false,
          environment: config.environment,
          targets: [
            {
              name: config.targetService,
              type: 'infrastructure',
              selector: {
                type: 'label',
                criteria: { service: config.targetService },
              },
              configuration: {
                filesystem: config.filesystem,
                intensity: config.ioIntensity,
                ...settings,
              },
            },
          ],
          parameters: {
            io_intensity: config.ioIntensity,
            filesystem: config.filesystem,
            duration: config.duration,
          },
          safeguards: [
            {
              name: 'disk_space_protection',
              type: 'resource_limit',
              configuration: { min_free_space_gb: 5 },
              enabled: true,
            },
            {
              name: 'io_wait_protection',
              type: 'circuit_breaker',
              configuration: { max_io_wait_percentage: 80 },
              enabled: true,
            },
          ],
        },
        steadyState: {
          title: 'Disk I/O performance is acceptable',
          description: 'System maintains responsiveness despite I/O load',
          probes: [
            {
              name: 'disk_response_time',
              type: 'metric',
              configuration: {
                query: 'avg_over_time(node_disk_io_time_seconds_total[1m])',
              },
              tolerance: { max: 0.5 },
              frequency: 10,
              timeout: 5,
              retries: 2,
            },
            {
              name: 'disk_utilization',
              type: 'metric',
              configuration: {
                query: 'rate(node_disk_io_time_seconds_total[5m]) * 100',
              },
              tolerance: { max: 85 },
              frequency: 15,
              timeout: 5,
              retries: 1,
            },
          ],
          tolerance: {
            failureThreshold: 25,
            responseTimeThreshold: 6000,
            errorRateThreshold: 5,
            customTolerances: [],
          },
        },
        method: [
          {
            name: 'stress_disk_io',
            type: 'action',
            provider: 'system',
            module: 'stress',
            function: 'io',
            arguments: {
              workers: settings.workers,
              block_size: settings.blockSize,
              operations: settings.operations,
              filesystem: config.filesystem,
              timeout: config.duration,
            },
            configuration: {
              timeout: config.duration + 60,
              retries: 2,
              background: true,
              continueOnFailure: false,
              rollbackOnFailure: true,
            },
          },
        ],
        rollback: {
          enabled: true,
          automatic: true,
          conditions: [
            {
              type: 'steady_state_violation',
              threshold: 40,
            },
            {
              type: 'custom',
              validator: (metrics) => metrics.system.disk_io > 90,
            },
          ],
          methods: [
            {
              name: 'stop_disk_stress',
              type: 'action',
              provider: 'system',
              module: 'stress',
              function: 'stop',
              arguments: {
                signal: 'SIGTERM',
              },
              configuration: {
                timeout: 30,
                retries: 3,
                background: false,
                continueOnFailure: false,
                rollbackOnFailure: false,
              },
            },
            {
              name: 'cleanup_test_files',
              type: 'action',
              provider: 'system',
              module: 'filesystem',
              function: 'cleanup',
              arguments: {
                path: '/tmp/chaos-*',
                force: true,
              },
              configuration: {
                timeout: 30,
                retries: 2,
                background: false,
                continueOnFailure: true,
                rollbackOnFailure: false,
              },
            },
          ],
          timeout: 90,
        },
        monitoring: {
          enabled: true,
          metrics: [
            {
              name: 'disk_io_utilization',
              source: 'prometheus',
              query: 'rate(node_disk_io_time_seconds_total[5m]) * 100',
              aggregation: 'avg',
              threshold: { warning: 70, critical: 85 },
            },
            {
              name: 'disk_queue_depth',
              source: 'prometheus',
              query: 'node_disk_io_now',
              aggregation: 'avg',
              threshold: { warning: 10, critical: 20 },
            },
            {
              name: 'io_wait_time',
              source: 'prometheus',
              query: 'rate(node_cpu_seconds_total{mode="iowait"}[5m]) * 100',
              aggregation: 'avg',
              threshold: { warning: 20, critical: 50 },
            },
          ],
          alerts: [
            {
              name: 'high_io_wait',
              condition: 'io_wait_time > 40',
              severity: 'warning',
              channels: ['slack-performance'],
              suppressDuration: 10,
            },
            {
              name: 'disk_saturation',
              condition: 'disk_io_utilization > 85',
              severity: 'critical',
              channels: ['pagerduty'],
              suppressDuration: 5,
            },
          ],
          dashboards: ['disk-performance'],
          notifications: [],
        },
        metadata: {
          author: 'storage-team',
          team: 'infrastructure',
          environment: config.environment,
          tags: ['disk', 'io', 'performance', 'storage'],
          createdAt: new Date(),
          version: '1.6.0',
          riskLevel: config.ioIntensity === 'heavy' ? 'high' : 'medium',
        },
      };
    },
  };

  /**
   * Service degradation experiments
   */
  static serviceDegradation = {
    /**
     * Kill random pods
     */
    podKiller: (config: {
      serviceName: string;
      killPercentage: number;
      duration: number;
      namespace?: string;
      environment: string;
    }): ChaosExperiment => ({
      id: `pod_killer_${config.serviceName}_${Date.now()}`,
      name: `Pod Killer - ${config.serviceName}`,
      description: `Kill ${config.killPercentage}% of ${config.serviceName} pods randomly`,
      type: 'service_degradation',
      target: 'service',
      hypothesis: `${config.serviceName} should handle ${config.killPercentage}% pod failures gracefully`,
      blastRadius: 'service',
      configuration: {
        duration: config.duration,
        tolerance: config.killPercentage + 10, // Allow slightly more degradation
        parallel: false,
        dryRun: false,
        environment: config.environment,
        targets: [
          {
            name: config.serviceName,
            type: 'service',
            selector: {
              type: 'label',
              criteria: {
                'app.kubernetes.io/name': config.serviceName,
                ...(config.namespace && { namespace: config.namespace }),
              },
            },
            percentage: config.killPercentage,
            configuration: {
              kill_mode: 'random',
              grace_period: 0,
            },
          },
        ],
        parameters: {
          kill_percentage: config.killPercentage,
          interval: 30, // seconds between kills
          grace_period: 0,
        },
        safeguards: [
          {
            name: 'minimum_replicas',
            type: 'resource_limit',
            configuration: { min_healthy_replicas: 1 },
            enabled: true,
          },
        ],
      },
      steadyState: {
        title: 'Service availability is maintained',
        description: 'Service continues to serve requests despite pod failures',
        probes: [
          {
            name: 'service_availability',
            type: 'http',
            configuration: {
              url: `https://${config.serviceName}.${config.environment}.intelgraph.io/health`,
              expectedStatus: [200, 503], // Allow some degradation
              timeout: 10,
            },
            tolerance: {
              custom: (result) => [200, 503].includes(result.status),
            },
            frequency: 15,
            timeout: 10,
            retries: 3,
          },
          {
            name: 'healthy_replicas_count',
            type: 'metric',
            configuration: {
              query: `kube_deployment_status_replicas_available{deployment="${config.serviceName}"}`,
            },
            tolerance: { min: 1 },
            frequency: 10,
            timeout: 5,
            retries: 2,
          },
        ],
        tolerance: {
          failureThreshold: config.killPercentage + 5,
          responseTimeThreshold: 5000,
          errorRateThreshold: config.killPercentage,
          customTolerances: [],
        },
      },
      method: [
        {
          name: 'kill_random_pods',
          type: 'action',
          provider: 'kubernetes',
          module: 'pod',
          function: 'kill_random',
          arguments: {
            label_selector: `app.kubernetes.io/name=${config.serviceName}`,
            namespace: config.namespace || 'default',
            qty: config.killPercentage,
            mode: 'percentage',
            grace_period: 0,
          },
          configuration: {
            timeout: 60,
            retries: 3,
            background: true,
            continueOnFailure: true, // Continue even if some kills fail
            rollbackOnFailure: false, // No rollback needed for pod kills
          },
          pauses: {
            before: 10,
            after: 30,
          },
        },
      ],
      rollback: {
        enabled: false, // Pod kills don't need rollback - Kubernetes will restart
        automatic: false,
        conditions: [],
        methods: [],
        timeout: 0,
      },
      monitoring: {
        enabled: true,
        metrics: [
          {
            name: 'pod_restart_rate',
            source: 'prometheus',
            query: `rate(kube_pod_container_status_restarts_total{pod=~"${config.serviceName}-.*"}[5m])`,
            aggregation: 'sum',
            threshold: { warning: 0.1, critical: 0.5 },
          },
          {
            name: 'service_error_rate',
            source: 'prometheus',
            query: `rate(http_requests_total{service="${config.serviceName}",status=~"5.."}[5m])`,
            aggregation: 'avg',
            threshold: { warning: 0.01, critical: 0.05 },
          },
          {
            name: 'deployment_available_replicas',
            source: 'prometheus',
            query: `kube_deployment_status_replicas_available{deployment="${config.serviceName}"}`,
            aggregation: 'min',
            threshold: { warning: 2, critical: 1 },
          },
        ],
        alerts: [
          {
            name: 'service_unavailable',
            condition: 'deployment_available_replicas < 1',
            severity: 'critical',
            channels: ['pagerduty', 'slack-critical'],
            suppressDuration: 2,
          },
          {
            name: 'high_restart_rate',
            condition: 'pod_restart_rate > 0.3',
            severity: 'warning',
            channels: ['slack-alerts'],
            suppressDuration: 10,
          },
        ],
        dashboards: ['kubernetes-workloads', 'service-health'],
        notifications: [
          {
            type: 'slack',
            configuration: {
              webhook_url: '${SLACK_WEBHOOK_URL}',
              channel: '#chaos-experiments',
            },
            events: ['experiment_started', 'pod_killed', 'service_degraded'],
          },
        ],
      },
      metadata: {
        author: 'kubernetes-team',
        team: 'platform',
        environment: config.environment,
        tags: ['kubernetes', 'pod', 'availability', 'resilience'],
        createdAt: new Date(),
        version: '3.2.0',
        riskLevel: config.killPercentage > 50 ? 'high' : 'medium',
      },
    }),
  };

  /**
   * Database chaos experiments
   */
  static database = {
    /**
     * Database connection exhaustion
     */
    connectionExhaustion: (config: {
      databaseHost: string;
      maxConnections: number;
      duration: number;
      environment: string;
    }): ChaosExperiment => ({
      id: `db_conn_exhaustion_${Date.now()}`,
      name: `Database Connection Exhaustion`,
      description: `Exhaust database connections to test application resilience`,
      type: 'dependency_failure',
      target: 'database',
      hypothesis: `Application should handle database connection exhaustion gracefully`,
      blastRadius: 'service',
      configuration: {
        duration: config.duration,
        tolerance: 20,
        parallel: false,
        dryRun: false,
        environment: config.environment,
        targets: [
          {
            name: config.databaseHost,
            type: 'database',
            selector: {
              type: 'name',
              criteria: { host: config.databaseHost },
            },
            configuration: {
              max_connections: config.maxConnections,
              connection_hold_time: config.duration,
            },
          },
        ],
        parameters: {
          host: config.databaseHost,
          max_connections: config.maxConnections,
          duration: config.duration,
        },
        safeguards: [
          {
            name: 'connection_limit',
            type: 'resource_limit',
            configuration: {
              max_connections_consumed: config.maxConnections * 0.8,
            },
            enabled: true,
          },
        ],
      },
      steadyState: {
        title: 'Database connectivity is functional',
        description: 'Applications can obtain database connections',
        probes: [
          {
            name: 'database_connectivity',
            type: 'database',
            configuration: {
              host: config.databaseHost,
              query: 'SELECT 1',
              timeout: 5,
            },
            tolerance: {
              custom: (result) => result.query_time < 1000,
            },
            frequency: 10,
            timeout: 5,
            retries: 3,
          },
          {
            name: 'active_connections',
            type: 'database',
            configuration: {
              host: config.databaseHost,
              query: 'SELECT COUNT(*) FROM pg_stat_activity',
              timeout: 5,
            },
            tolerance: { max: config.maxConnections * 0.9 },
            frequency: 5,
            timeout: 5,
            retries: 2,
          },
        ],
        tolerance: {
          failureThreshold: 15,
          responseTimeThreshold: 3000,
          errorRateThreshold: 10,
          customTolerances: [],
        },
      },
      method: [
        {
          name: 'exhaust_connections',
          type: 'action',
          provider: 'database',
          module: 'postgresql',
          function: 'exhaust_connections',
          arguments: {
            host: config.databaseHost,
            port: 5432,
            target_connections: config.maxConnections,
            hold_duration: config.duration,
          },
          configuration: {
            timeout: config.duration + 60,
            retries: 2,
            background: true,
            continueOnFailure: false,
            rollbackOnFailure: true,
          },
        },
      ],
      rollback: {
        enabled: true,
        automatic: true,
        conditions: [
          {
            type: 'steady_state_violation',
            threshold: 30,
          },
        ],
        methods: [
          {
            name: 'release_connections',
            type: 'action',
            provider: 'database',
            module: 'postgresql',
            function: 'kill_connections',
            arguments: {
              host: config.databaseHost,
              port: 5432,
              pattern: 'chaos_*',
            },
            configuration: {
              timeout: 30,
              retries: 3,
              background: false,
              continueOnFailure: false,
              rollbackOnFailure: false,
            },
          },
        ],
        timeout: 60,
      },
      monitoring: {
        enabled: true,
        metrics: [
          {
            name: 'database_connections',
            source: 'prometheus',
            query: 'pg_stat_database_numbackends{datname="postgres"}',
            aggregation: 'sum',
            threshold: {
              warning: config.maxConnections * 0.8,
              critical: config.maxConnections * 0.95,
            },
          },
          {
            name: 'connection_errors',
            source: 'prometheus',
            query: 'rate(postgresql_connection_errors_total[5m])',
            aggregation: 'sum',
            threshold: { warning: 0.1, critical: 1.0 },
          },
        ],
        alerts: [
          {
            name: 'connection_pool_exhausted',
            condition:
              'database_connections >= ' + config.maxConnections * 0.95,
            severity: 'critical',
            channels: ['pagerduty'],
            suppressDuration: 5,
          },
        ],
        dashboards: ['database-performance'],
        notifications: [],
      },
      metadata: {
        author: 'database-team',
        team: 'data',
        environment: config.environment,
        tags: ['database', 'postgresql', 'connections', 'exhaustion'],
        createdAt: new Date(),
        version: '1.4.0',
        riskLevel: 'high',
      },
    }),
  };
}
