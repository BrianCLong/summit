export interface FunnelStep {
    name: string;
    eventType: string;
    // Optional props matching
    props?: Record<string, string>;
}

export interface Funnel {
    id: string;
    name: string;
    steps: FunnelStep[];
    windowSeconds: number; // Max time between first and last step
}

export interface FunnelReport {
    funnelId: string;
    totalStarted: number;
    completed: number;
    stepCounts: Record<string, number>; // Step index -> count of users who reached this step
    dropOffRates: Record<string, number>; // Step index -> % drop from previous
}
