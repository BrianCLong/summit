import { SummitsightDataService } from '../SummitsightDataService';
import { Forecast, KPIValue } from '../types';

export class ForecastingEngine {
    private dataService: SummitsightDataService;

    constructor() {
        this.dataService = new SummitsightDataService();
    }

    /**
     * Generates a 7-day forecast for a KPI.
     */
    async generateForecast(kpiId: string, tenantId: string): Promise<Forecast[]> {
        const history = await this.dataService.getKPIValues(kpiId, tenantId, 'daily', 30);
        // Sort ascending by time
        const sortedHistory = history.sort((a, b) => new Date(a.time_bucket).getTime() - new Date(b.time_bucket).getTime());

        if (sortedHistory.length < 5) {
            return []; // Not enough data
        }

        const values = sortedHistory.map(v => Number(v.value));
        const lastDate = new Date(sortedHistory[sortedHistory.length - 1].time_bucket);

        // Simple Linear Regression for demo purposes
        // In prod, use Holt-Winters or Arima via a dedicated worker
        const regression = this.linearRegression(values);

        const forecasts: Forecast[] = [];
        for (let i = 1; i <= 7; i++) {
            const nextVal = regression.slope * (values.length + i) + regression.intercept;
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + i);

            const forecast: Forecast = {
                kpi_id: kpiId,
                tenant_id: tenantId,
                forecast_date: nextDate.toISOString(),
                predicted_value: nextVal,
                confidence_interval_lower: nextVal * 0.9,
                confidence_interval_upper: nextVal * 1.1,
                model_version: 'linear-v1'
            };

            await this.dataService.saveForecast(forecast);
            forecasts.push(forecast);
        }

        return forecasts;
    }

    private linearRegression(y: number[]) {
        const n = y.length;
        const x = Array.from({ length: n }, (_, i) => i + 1);

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    }
}
