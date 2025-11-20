import { Pool } from 'pg';
import { Driver } from 'neo4j-driver';
import { RedisClientType } from 'redis';
export interface Widget {
    id: string;
    type: 'chart' | 'metric' | 'table' | 'graph' | 'map' | 'text';
    title: string;
    description?: string;
    config: WidgetConfig;
    dataSource: DataSource;
    position: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    refreshInterval?: number;
    isVisible: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface WidgetConfig {
    chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'heatmap';
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';
    timeRange?: {
        start: Date;
        end: Date;
        interval: string;
    };
    groupBy?: string[];
    filters?: Record<string, any>;
    visualization?: {
        showLegend?: boolean;
        showAxes?: boolean;
        colorScheme?: string;
        customColors?: string[];
        animations?: boolean;
    };
    styling?: {
        backgroundColor?: string;
        textColor?: string;
        borderColor?: string;
        fontSize?: number;
    };
}
export interface DataSource {
    id: string;
    type: 'sql' | 'cypher' | 'api' | 'static';
    query: string;
    parameters?: Record<string, any>;
    cacheTTL?: number;
    transformations?: DataTransformation[];
}
export interface DataTransformation {
    type: 'filter' | 'aggregate' | 'sort' | 'map' | 'pivot' | 'join';
    config: Record<string, any>;
}
export interface Dashboard {
    id: string;
    name: string;
    description?: string;
    widgets: Widget[];
    layout: 'grid' | 'flex' | 'custom';
    theme: 'light' | 'dark' | 'auto';
    isPublic: boolean;
    shareToken?: string;
    tags: string[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    accessControl: {
        viewers: string[];
        editors: string[];
        owners: string[];
    };
    settings: {
        autoRefresh?: boolean;
        refreshInterval?: number;
        timezone?: string;
        dateFormat?: string;
        showTitle?: boolean;
        allowExport?: boolean;
    };
}
export interface DashboardTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    widgets: Omit<Widget, 'id' | 'createdAt' | 'updatedAt'>[];
    tags: string[];
    isBuiltIn: boolean;
    preview?: string;
}
export declare class DashboardService {
    private pgPool;
    private neo4jDriver;
    private redisClient;
    constructor(pgPool: Pool, neo4jDriver: Driver, redisClient: RedisClientType);
    private parseCachePayload;
    createDashboard(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Dashboard>;
    getDashboard(dashboardId: string, userId: string): Promise<Dashboard | null>;
    updateDashboard(dashboardId: string, updates: Partial<Dashboard>, userId: string): Promise<Dashboard>;
    deleteDashboard(dashboardId: string, userId: string): Promise<void>;
    getWidgetData(widgetId: string, userId: string): Promise<any>;
    private createWidget;
    private getDashboardWidgets;
    private getWidget;
    private executeDataSource;
    private executeSqlDataSource;
    private executeCypherDataSource;
    private executeApiDataSource;
    private applyTransformation;
    private applyFilterTransformation;
    private applyAggregateTransformation;
    private applySortTransformation;
    private applyMapTransformation;
    private checkDashboardAccess;
    private invalidateDashboardCache;
    listDashboards(userId: string, options?: {
        limit?: number;
        offset?: number;
        search?: string;
        tags?: string[];
        sortBy?: 'name' | 'created_at' | 'updated_at';
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        dashboards: Dashboard[];
        total: number;
    }>;
    getDashboardTemplates(category?: string): Promise<DashboardTemplate[]>;
    createDashboardFromTemplate(templateId: string, name: string, userId: string, customizations?: Record<string, any>): Promise<Dashboard>;
}
