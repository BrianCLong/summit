"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoScalingPolicyGenerator = void 0;
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
class AutoScalingPolicyGenerator {
    static DEFAULT_NAMESPACE = 'default';
    static DEFAULT_MIN_REPLICAS = 2;
    static DEFAULT_MAX_REPLICAS = 10;
    static TARGET_CPU_UTILIZATION = 70; // 70%
    static TARGET_MEMORY_UTILIZATION = 80; // 80%
    /**
     * Generates HPA and VPA configurations based on service metrics.
     * @param serviceName The name of the service (deployment)
     * @param metrics The current or aggregated metrics for the service
     * @param containerName The name of the container within the pod (for VPA)
     * @returns ScalingPolicies containing HPA and VPA objects
     */
    generatePolicies(serviceName, metrics, containerName = serviceName, namespace = AutoScalingPolicyGenerator.DEFAULT_NAMESPACE) {
        logger_js_1.default.info(`Generating scaling policies for ${serviceName}`, { metrics });
        const hpa = this.generateHPA(serviceName, metrics, namespace);
        const vpa = this.generateVPA(serviceName, metrics, containerName, namespace);
        return {
            hpa,
            vpa,
            recommendationReason: this.generateReason(metrics),
        };
    }
    generateHPA(serviceName, metrics, namespace) {
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
    generateVPA(serviceName, metrics, containerName, namespace) {
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
    generateReason(metrics) {
        const reasons = [];
        if (metrics.cpuUsagePercent > AutoScalingPolicyGenerator.TARGET_CPU_UTILIZATION) {
            reasons.push(`High CPU usage (${metrics.cpuUsagePercent}%)`);
        }
        // Threshold is 200MB in generateVPA, so we match that here for the reason
        if (metrics.memoryUsageBytes > 1024 * 1024 * 200) {
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
exports.AutoScalingPolicyGenerator = AutoScalingPolicyGenerator;
