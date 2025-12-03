import logger from '../../utils/logger';

export interface ServiceMetrics {
  cpuUsagePercent: number; // Current or average CPU usage (0-100)
  memoryUsageBytes: number; // Current or average memory usage in bytes
  requestRateRPS: number; // Requests per second
  p95LatencyMs: number; // 95th percentile latency in ms
  errorRatePercent: number; // Error rate percentage
  timestamp: Date;
}

export interface HPAConfig {
  apiVersion: string;
  kind: 'HorizontalPodAutoscaler';
  metadata: {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
  };
  spec: {
    scaleTargetRef: {
      apiVersion: string;
      kind: string;
      name: string;
    };
    minReplicas: number;
    maxReplicas: number;
    metrics: Array<{
      type: string;
      resource?: {
        name: string;
        target: {
          type: string;
          averageUtilization?: number;
          averageValue?: string;
        };
      };
      object?: {
        metric: {
          name: string;
        };
        target: {
          type: string;
          value: string;
        };
      };
    }>;
    behavior?: {
      scaleUp?: ScalingBehavior;
      scaleDown?: ScalingBehavior;
    };
  };
}

interface ScalingBehavior {
  stabilizationWindowSeconds?: number;
  policies?: Array<{
    type: 'Pods' | 'Percent';
    value: number;
    periodSeconds: number;
  }>;
}

export interface VPAConfig {
  apiVersion: string;
  kind: 'VerticalPodAutoscaler';
  metadata: {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
  };
  spec: {
    targetRef: {
      apiVersion: string;
      kind: string;
      name: string;
    };
    updatePolicy: {
      updateMode: 'Off' | 'Initial' | 'Recreate' | 'Auto';
    };
    resourcePolicy?: {
      containerPolicies: Array<{
        containerName: string;
        minAllowed?: {
          cpu?: string;
          memory?: string;
        };
        maxAllowed?: {
          cpu?: string;
          memory?: string;
        };
      }>;
    };
  };
}

export interface ScalingPolicies {
  hpa: HPAConfig;
  vpa: VPAConfig;
  recommendationReason: string;
}

export class AutoScalingPolicyGenerator {
  private static readonly DEFAULT_NAMESPACE = 'default';
  private static readonly DEFAULT_MIN_REPLICAS = 2;
  private static readonly DEFAULT_MAX_REPLICAS = 10;
  private static readonly TARGET_CPU_UTILIZATION = 70; // 70%
  private static readonly TARGET_MEMORY_UTILIZATION = 80; // 80%

  /**
   * Generates HPA and VPA configurations based on service metrics.
   * @param serviceName The name of the service (deployment)
   * @param metrics The current or aggregated metrics for the service
   * @param containerName The name of the container within the pod (for VPA)
   * @returns ScalingPolicies containing HPA and VPA objects
   */
  public generatePolicies(
    serviceName: string,
    metrics: ServiceMetrics,
    containerName: string = serviceName,
    namespace: string = AutoScalingPolicyGenerator.DEFAULT_NAMESPACE
  ): ScalingPolicies {
    logger.info(`Generating scaling policies for ${serviceName}`, { metrics });

    const hpa = this.generateHPA(serviceName, metrics, namespace);
    const vpa = this.generateVPA(serviceName, metrics, containerName, namespace);

    return {
      hpa,
      vpa,
      recommendationReason: this.generateReason(metrics),
    };
  }

  private generateHPA(
    serviceName: string,
    metrics: ServiceMetrics,
    namespace: string
  ): HPAConfig {
    // Determine min/max replicas based on traffic load
    // Simple heuristic: 1 replica per 50 RPS, but strictly bounded
    let suggestedMaxReplicas = Math.ceil(metrics.requestRateRPS / 50) + 2;
    suggestedMaxReplicas = Math.max(suggestedMaxReplicas, AutoScalingPolicyGenerator.DEFAULT_MAX_REPLICAS);

    // If latency is high, we might need more replicas (or more CPU, which VPA handles, but HPA helps with concurrency)
    if (metrics.p95LatencyMs > 500) {
        suggestedMaxReplicas = Math.ceil(suggestedMaxReplicas * 1.5);
    }

    return {
      apiVersion: 'autoscaling/v2',
      kind: 'HorizontalPodAutoscaler',
      metadata: {
        name: `${serviceName}-hpa`,
        namespace,
        labels: {
          'app.kubernetes.io/name': serviceName,
          'app.kubernetes.io/managed-by': 'auto-scaling-policy-generator',
        },
      },
      spec: {
        scaleTargetRef: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          name: serviceName,
        },
        minReplicas: AutoScalingPolicyGenerator.DEFAULT_MIN_REPLICAS,
        maxReplicas: suggestedMaxReplicas,
        metrics: [
          {
            type: 'Resource',
            resource: {
              name: 'cpu',
              target: {
                type: 'Utilization',
                averageUtilization: AutoScalingPolicyGenerator.TARGET_CPU_UTILIZATION,
              },
            },
          },
          {
            type: 'Resource',
            resource: {
              name: 'memory',
              target: {
                type: 'Utilization',
                averageUtilization: AutoScalingPolicyGenerator.TARGET_MEMORY_UTILIZATION,
              },
            },
          },
        ],
        behavior: {
          scaleUp: {
            stabilizationWindowSeconds: 0,
            policies: [
              {
                type: 'Percent',
                value: 100,
                periodSeconds: 15,
              },
              {
                type: 'Pods',
                value: 4,
                periodSeconds: 15,
              },
            ],
          },
          scaleDown: {
            stabilizationWindowSeconds: 300,
            policies: [
              {
                type: 'Percent',
                value: 100,
                periodSeconds: 15,
              },
            ],
          },
        },
      },
    };
  }

  private generateVPA(
    serviceName: string,
    metrics: ServiceMetrics,
    containerName: string,
    namespace: string
  ): VPAConfig {
    // Basic estimation of resource needs
    // If current usage is high, we suggest higher bounds.

    // Note: This is a static generation based on a snapshot.
    // Real VPA in k8s observes over time. Here we set "Auto" mode so k8s VPA handles it,
    // but we can provide minAllowed based on our knowledge of the app's baseline.

    const minCpu = '100m';
    const minMemory = '128Mi';

    // If we observe high memory usage, we might want to bump the minAllowed
    const suggestedMinMemory = metrics.memoryUsageBytes > 1024 * 1024 * 200 // > 200MB
        ? '256Mi'
        : minMemory;

    return {
      apiVersion: 'autoscaling.k8s.io/v1',
      kind: 'VerticalPodAutoscaler',
      metadata: {
        name: `${serviceName}-vpa`,
        namespace,
        labels: {
          'app.kubernetes.io/name': serviceName,
          'app.kubernetes.io/managed-by': 'auto-scaling-policy-generator',
        },
      },
      spec: {
        targetRef: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          name: serviceName,
        },
        updatePolicy: {
          updateMode: 'Auto',
        },
        resourcePolicy: {
          containerPolicies: [
            {
              containerName: containerName,
              minAllowed: {
                cpu: minCpu,
                memory: suggestedMinMemory,
              },
              maxAllowed: {
                cpu: '4', // Cap at 4 cores
                memory: '8Gi', // Cap at 8GB
              },
            },
          ],
        },
      },
    };
  }

  private generateReason(metrics: ServiceMetrics): string {
    const reasons: string[] = [];
    if (metrics.cpuUsagePercent > AutoScalingPolicyGenerator.TARGET_CPU_UTILIZATION) {
      reasons.push(`High CPU usage (${metrics.cpuUsagePercent}%)`);
    }
    if (metrics.memoryUsageBytes > 1024 * 1024 * 500) { // > 500MB
      reasons.push(`High Memory usage (${(metrics.memoryUsageBytes / 1024 / 1024).toFixed(2)} MB)`);
    }
    if (metrics.requestRateRPS > 100) {
      reasons.push(`High Request Rate (${metrics.requestRateRPS} RPS)`);
    }
    if (metrics.p95LatencyMs > 500) {
      reasons.push(`High Latency (${metrics.p95LatencyMs} ms)`);
    }

    if (reasons.length === 0) {
      return 'Metrics within normal ranges. Standard scaling policies applied.';
    }

    return `Adjusted policies due to: ${reasons.join(', ')}`;
  }
}
