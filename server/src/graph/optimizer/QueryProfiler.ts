
export interface QueryProfile {
    totalDuration: number;
    breakdown: {
        parsing: number;
        planning: number;
        optimization: number;
        execution: number;
    };
    timestamp: number;
    queryId: string;
}

export class QueryProfiler {
    private marks: Map<string, number> = new Map();
    private profile: Partial<QueryProfile> = {};

    constructor(private queryId: string) {
        this.profile.queryId = queryId;
        this.profile.timestamp = Date.now();
        this.profile.breakdown = {
            parsing: 0,
            planning: 0,
            optimization: 0,
            execution: 0
        };
    }

    public start(phase: keyof QueryProfile['breakdown'] | 'total') {
        this.marks.set(`${phase}_start`, performance.now());
    }

    public end(phase: keyof QueryProfile['breakdown'] | 'total') {
        const start = this.marks.get(`${phase}_start`);
        if (start) {
            const duration = performance.now() - start;
            if (phase === 'total') {
                this.profile.totalDuration = duration;
            } else {
                if (this.profile.breakdown) {
                    this.profile.breakdown[phase] = duration;
                }
            }
        }
    }

    public getProfile(): QueryProfile {
        return this.profile as QueryProfile;
    }
}
