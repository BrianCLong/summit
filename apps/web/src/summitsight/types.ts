export interface KPIDefinition {
    kpi_id: string;
    name: string;
    description?: string;
    category: 'engineering' | 'business' | 'security' | 'foresight' | 'compliance';
    unit?: string;
    direction: 'higher_is_better' | 'lower_is_better';
}

export interface KPIStatus {
    definition: KPIDefinition;
    currentValue: number | null;
    status: 'green' | 'yellow' | 'red' | 'unknown';
    lastUpdated: string | null;
}

export interface RiskAssessment {
    risk_category: string;
    risk_score: number;
    factors: Record<string, any>;
    assessed_at: string;
}

export interface Forecast {
    kpi_id: string;
    forecast_date: string;
    predicted_value: number;
    confidence_interval_lower: number;
    confidence_interval_upper: number;
}
