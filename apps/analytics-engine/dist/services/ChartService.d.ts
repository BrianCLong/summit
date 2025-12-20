import { Pool } from 'pg';
import { Driver } from 'neo4j-driver';
export interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
    metadata?: {
        total?: number;
        aggregation?: string;
        timeRange?: {
            start: Date;
            end: Date;
        };
        generatedAt: Date;
    };
}
export interface ChartDataset {
    label: string;
    data: number[] | {
        x: any;
        y: any;
    }[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
    pointRadius?: number;
    pointHoverRadius?: number;
}
export interface ChartQuery {
    type: 'time-series' | 'categorical' | 'comparison' | 'distribution' | 'relationship';
    dataSource: 'postgres' | 'neo4j';
    query: string;
    parameters?: Record<string, any>;
    groupBy?: string | string[];
    aggregateBy?: string;
    aggregateFunction?: 'count' | 'sum' | 'avg' | 'min' | 'max';
    timeField?: string;
    timeInterval?: 'hour' | 'day' | 'week' | 'month' | 'year';
    limit?: number;
    colorScheme?: string;
}
export declare class ChartService {
    private pgPool;
    private neo4jDriver;
    private colorSchemes;
    constructor(pgPool: Pool, neo4jDriver: Driver);
    generateChartData(chartQuery: ChartQuery): Promise<ChartData>;
    private executePostgresQuery;
    private executeNeo4jQuery;
    private transformDataForChart;
    private transformTimeSeriesData;
    private transformCategoricalData;
    private transformComparisonData;
    private transformDistributionData;
    private transformRelationshipData;
    private groupAndAggregate;
    private formatDateLabel;
    private getColorScheme;
    private darkenColor;
    getEntityGrowthChart(timeRange: {
        start: Date;
        end: Date;
    }): Promise<ChartData>;
    getEntityTypeDistribution(): Promise<ChartData>;
    getCaseStatusComparison(): Promise<ChartData>;
    getRelationshipStrengthDistribution(): Promise<ChartData>;
    getActivityHeatmapData(days?: number): Promise<any>;
}
