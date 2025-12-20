import { Driver } from 'neo4j-driver';
import { GraphNode, GraphEdge } from './GraphAnalyticsService';
export interface VisualizationLayout {
    type: 'force' | 'hierarchical' | 'circular' | 'grid' | 'concentric' | 'breadthfirst';
    options: Record<string, any>;
}
export interface NodeStyle {
    size: number;
    color: string;
    shape: 'ellipse' | 'triangle' | 'rectangle' | 'diamond' | 'star' | 'pentagon';
    borderWidth: number;
    borderColor: string;
    label?: {
        text: string;
        fontSize: number;
        color: string;
        position: 'center' | 'top' | 'bottom';
    };
}
export interface EdgeStyle {
    width: number;
    color: string;
    style: 'solid' | 'dashed' | 'dotted';
    arrow: boolean;
    curvature: number;
    label?: {
        text: string;
        fontSize: number;
        color: string;
    };
}
export interface VisualizationConfig {
    layout: VisualizationLayout;
    nodeStyles: Record<string, NodeStyle>;
    edgeStyles: Record<string, EdgeStyle>;
    filters: {
        nodeLabels?: string[];
        relationshipTypes?: string[];
        propertyFilters?: {
            property: string;
            operator: string;
            value: any;
        }[];
    };
    rendering: {
        showLabels: boolean;
        showEdgeLabels: boolean;
        enablePhysics: boolean;
        enableInteraction: boolean;
        backgroundColor: string;
        theme: 'light' | 'dark';
    };
    performance: {
        maxNodes: number;
        maxEdges: number;
        simplifyBeyondThreshold: boolean;
        clustering: boolean;
    };
}
export interface NetworkVisualization {
    id: string;
    name: string;
    description?: string;
    config: VisualizationConfig;
    data: {
        nodes: (GraphNode & {
            style: NodeStyle;
            position?: {
                x: number;
                y: number;
            };
        })[];
        edges: (GraphEdge & {
            style: EdgeStyle;
        })[];
    };
    metadata: {
        totalNodes: number;
        totalEdges: number;
        visibleNodes: number;
        visibleEdges: number;
        renderTime?: number;
        generatedAt: Date;
    };
}
export interface InteractiveFeatures {
    nodeClick: {
        action: 'expand' | 'highlight' | 'details' | 'custom';
        config: Record<string, any>;
    };
    nodeHover: {
        showTooltip: boolean;
        highlightConnections: boolean;
        tooltipTemplate: string;
    };
    selection: {
        multiSelect: boolean;
        selectConnected: boolean;
        actions: Array<{
            name: string;
            action: string;
            icon?: string;
        }>;
    };
}
export declare class NetworkVisualizationService {
    private neo4jDriver;
    constructor(neo4jDriver: Driver);
    generateVisualization(query: string, parameters: Record<string, any>, config: VisualizationConfig): Promise<NetworkVisualization>;
    generateSubnetVisualization(centerNodeId: string, depth: number, config?: Partial<VisualizationConfig>): Promise<NetworkVisualization>;
    generateCommunityVisualization(communityIds: string[], config?: Partial<VisualizationConfig>): Promise<NetworkVisualization>;
    generatePathVisualization(sourceId: string, targetId: string, pathType?: 'shortest' | 'all', config?: Partial<VisualizationConfig>): Promise<NetworkVisualization>;
    generateTimelineVisualization(timeRange: {
        start: Date;
        end: Date;
    }, config?: Partial<VisualizationConfig>): Promise<NetworkVisualization>;
    private extractNode;
    private extractEdge;
    private shouldIncludeNode;
    private shouldIncludeEdge;
    private evaluatePropertyFilter;
    private simplifyNetwork;
    private getNodeStyle;
    private getEdgeStyle;
    private getDefaultNodeStyle;
    private getDefaultEdgeStyle;
    private calculateNodePosition;
    private mergeConfig;
    exportVisualization(visualization: NetworkVisualization, format: 'cytoscape' | 'gephi' | 'graphml' | 'json'): Promise<string>;
    private exportToCytoscape;
    private exportToGephi;
    private exportToGraphML;
}
