export interface Event {
    event_id: string;
    ts_offset_ms: number;
    actor: string;
    event_type: string;
    payload: Record<string, any>;
}

export interface ForecastResult {
    t: number;
    horizon: number;
    predicted: Event[];
    actual: Event[];
    divergence_score: number;
}

export class SerialTrajectoryEvaluator {
    private forecaster: any;

    constructor(forecaster: any) {
        this.forecaster = forecaster;
    }

    public evaluate(events: Event[], minContext: number, horizon: number): ForecastResult[] {
        const results: ForecastResult[] = [];

        for (let t = minContext; t < events.length; t++) {
            const context = events.slice(0, t);
            const target = events.slice(t, Math.min(t + horizon, events.length));

            // Mock prediction for now - returning actual target in a real scenario this would call a model
            const forecast = this.forecaster.predict(context, { horizon });

            results.push({
                t,
                horizon,
                predicted: forecast,
                actual: target,
                divergence_score: this.scoreForecast(forecast, target)
            });
        }

        return results;
    }

    private scoreForecast(predicted: Event[], actual: Event[]): number {
        // Simple mock scoring logic
        if (predicted.length === 0 && actual.length === 0) return 0.0;
        if (predicted.length !== actual.length) return 1.0;

        let diffs = 0;
        for (let i = 0; i < predicted.length; i++) {
            if (predicted[i].event_type !== actual[i].event_type) {
                diffs++;
            }
        }
        return diffs / predicted.length;
    }
}
