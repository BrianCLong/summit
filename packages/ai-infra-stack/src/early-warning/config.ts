export type SignalType = 'latency_spike' | 'error_rate_high' | 'capacity_warning' | 'node_failure' | 'network_partition';

export type PriorityLevel = 'P0' | 'P1' | 'P2' | 'P3';

export interface AlertDefinition {
    description: string;
    priority: PriorityLevel;
}

export type AlertSpec = Record<SignalType, AlertDefinition>;

export interface RateLimitConfig {
    windowMs: number;
    maxOccurrences: number;
}

export type RateLimits = Record<SignalType, RateLimitConfig>;

export const defaultAlertSpec: AlertSpec = {
    latency_spike: {
        description: 'Sudden increase in request latency',
        priority: 'P2',
    },
    error_rate_high: {
        description: 'Elevated error rate across services',
        priority: 'P1',
    },
    capacity_warning: {
        description: 'Resource capacity approaching limits',
        priority: 'P2',
    },
    node_failure: {
        description: 'Critical node failure detected',
        priority: 'P0',
    },
    network_partition: {
        description: 'Network partition between zones',
        priority: 'P0',
    }
};

export const defaultRateLimits: RateLimits = {
    latency_spike: { windowMs: 60000, maxOccurrences: 5 }, // 5 per minute
    error_rate_high: { windowMs: 60000, maxOccurrences: 3 }, // 3 per minute
    capacity_warning: { windowMs: 300000, maxOccurrences: 1 }, // 1 per 5 minutes
    node_failure: { windowMs: 60000, maxOccurrences: 1 }, // 1 per minute
    network_partition: { windowMs: 60000, maxOccurrences: 1 } // 1 per minute
};
