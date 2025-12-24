export type CTask = {
    id: string;
    secs: number;
    caps: string[];
    lane: 'gold' | 'silver' | 'bronze';
};
export type CPool = {
    id: string;
    caps: string[];
    max: int;
    costPerMin: number;
    laneShare: {
        gold: number;
        silver: number;
        bronze: number;
    };
};
export declare function schedule(tasks: CTask[], pools: CPool[]): Record<string, {
    load: number;
    items: CTask[];
}>;
//# sourceMappingURL=csat.d.ts.map