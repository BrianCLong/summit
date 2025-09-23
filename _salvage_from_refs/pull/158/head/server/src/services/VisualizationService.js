/**
 * Advanced Visualization Service - P2 Priority
 * Sophisticated visualization engine with multiple rendering modes and interactive features
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class VisualizationService extends EventEmitter {
  constructor(neo4jDriver, multimodalService, analyticsService, logger) {
    super();
    this.neo4jDriver = neo4jDriver;
    this.multimodalService = multimodalService;
    this.analyticsService = analyticsService;
    this.logger = logger;
    
    this.visualizationTypes = new Map();
    this.renderingEngines = new Map();
    this.layoutAlgorithms = new Map();
    this.styleThemes = new Map();
    this.interactionHandlers = new Map();
    this.visualizations = new Map();
    this.templates = new Map();
    
    this.metrics = {
      totalVisualizations: 0,
      renderedVisualizations: 0,
      interactiveViews: 0,
      exportedVisualizations: 0,
      averageRenderTime: 0,
      popularTypes: new Map()
    };
    
    this.initializeVisualizationTypes();
    this.initializeRenderingEngines();
    this.initializeLayoutAlgorithms();
    this.initializeStyleThemes();
    this.initializeInteractionHandlers();
    this.initializeTemplates();
  }
  
  initializeVisualizationTypes() {
    this.visualizationTypes.set('NETWORK_GRAPH', {
      id: 'NETWORK_GRAPH',
      name: 'Network Graph',
      description: 'Interactive network visualization with nodes and edges',
      category: 'NETWORK',
      engines: ['CYTOSCAPE', 'D3_FORCE', 'SIGMA'],
      layouts: ['FORCE_DIRECTED', 'HIERARCHICAL', 'CIRCULAR', 'GRID'],
      features: ['zoom', 'pan', 'select', 'filter', 'cluster', 'animate'],
      dataTypes: ['nodes', 'edges', 'clusters'],
      renderModes: ['SVG', 'CANVAS', 'WEBGL'],
      interactionTypes: ['node_click', 'edge_hover', 'selection_change', 'layout_complete'],
      exportFormats: ['PNG', 'SVG', 'PDF', 'GEXF', 'GRAPHML']
    });
    
    this.visualizationTypes.set('TIMELINE', {
      id: 'TIMELINE',
      name: 'Timeline Visualization',
      description: 'Temporal data visualization with interactive timeline',
      category: 'TEMPORAL',
      engines: ['VIS_TIMELINE', 'D3_TIMELINE', 'CUSTOM'],
      layouts: ['LINEAR', 'GROUPED', 'STACKED'],
      features: ['zoom', 'pan', 'select', 'filter', 'group', 'animate'],
      dataTypes: ['events', 'periods', 'milestones'],
      renderModes: ['SVG', 'HTML'],
      interactionTypes: ['time_select', 'event_click', 'range_change'],
      exportFormats: ['PNG', 'SVG', 'PDF', 'CSV']
    });
    
    this.visualizationTypes.set('GEOSPATIAL_MAP', {
      id: 'GEOSPATIAL_MAP',
      name: 'Geospatial Map',
      description: 'Geographic visualization with markers, heatmaps, and clusters',
      category: 'GEOSPATIAL',
      engines: ['LEAFLET', 'MAPBOX', 'GOOGLE_MAPS'],
      layouts: ['SATELLITE', 'TERRAIN', 'STREET', 'DARK'],
      features: ['zoom', 'pan', 'cluster', 'heatmap', 'filter', 'animate'],
      dataTypes: ['markers', 'polygons', 'heatmap_data', 'routes'],
      renderModes: ['TILES', 'VECTOR'],
      interactionTypes: ['marker_click', 'area_select', 'zoom_change'],
      exportFormats: ['PNG', 'PDF', 'KML', 'GEOJSON']
    });
    
    this.visualizationTypes.set('SANKEY_DIAGRAM', {
      id: 'SANKEY_DIAGRAM',
      name: 'Sankey Flow Diagram',
      description: 'Flow visualization showing relationships and quantities',
      category: 'FLOW',
      engines: ['D3_SANKEY', 'PLOTLY'],
      layouts: ['HORIZONTAL', 'VERTICAL'],
      features: ['hover', 'filter', 'animate'],
      dataTypes: ['nodes', 'flows'],
      renderModes: ['SVG', 'CANVAS'],
      interactionTypes: ['node_hover', 'flow_click'],
      exportFormats: ['PNG', 'SVG', 'PDF']
    });
    
    this.visualizationTypes.set('TREEMAP', {
      id: 'TREEMAP',
      name: 'Treemap Visualization',
      description: 'Hierarchical data visualization using nested rectangles',
      category: 'HIERARCHICAL',
      engines: ['D3_TREEMAP', 'PLOTLY'],
      layouts: ['SQUARIFIED', 'SLICE_DICE', 'STRIP'],
      features: ['drill_down', 'hover', 'filter', 'animate'],
      dataTypes: ['hierarchy', 'values'],
      renderModes: ['SVG', 'CANVAS'],
      interactionTypes: ['rectangle_click', 'drill_down', 'breadcrumb_nav'],
      exportFormats: ['PNG', 'SVG', 'PDF']
    });
    
    this.visualizationTypes.set('CHORD_DIAGRAM', {
      id: 'CHORD_DIAGRAM',
      name: 'Chord Diagram',
      description: 'Circular visualization showing relationships between entities',
      category: 'RELATIONSHIP',
      engines: ['D3_CHORD', 'CIRCOS'],
      layouts: ['CIRCULAR'],
      features: ['hover', 'filter', 'group', 'animate'],
      dataTypes: ['matrix', 'groups'],
      renderModes: ['SVG'],
      interactionTypes: ['chord_hover', 'group_click'],
      exportFormats: ['PNG', 'SVG', 'PDF']
    });
    
    this.visualizationTypes.set('PARALLEL_COORDINATES', {
      id: 'PARALLEL_COORDINATES',
      name: 'Parallel Coordinates',
      description: 'Multivariate data visualization with parallel axes',
      category: 'MULTIVARIATE',
      engines: ['D3_PARALLEL', 'PLOTLY'],
      layouts: ['STANDARD', 'ANGULAR'],
      features: ['brush', 'filter', 'reorder', 'animate'],
      dataTypes: ['dimensions', 'values'],
      renderModes: ['SVG', 'CANVAS'],
      interactionTypes: ['axis_brush', 'line_hover', 'dimension_reorder'],
      exportFormats: ['PNG', 'SVG', 'PDF', 'CSV']
    });
    
    this.visualizationTypes.set('HEATMAP', {
      id: 'HEATMAP',
      name: 'Heatmap Visualization',
      description: 'Matrix visualization showing intensity patterns',
      category: 'MATRIX',
      engines: ['D3_HEATMAP', 'PLOTLY'],
      layouts: ['MATRIX', 'CLUSTERED'],
      features: ['zoom', 'hover', 'filter', 'cluster'],
      dataTypes: ['matrix', 'labels'],
      renderModes: ['SVG', 'CANVAS'],
      interactionTypes: ['cell_hover', 'row_select', 'column_select'],
      exportFormats: ['PNG', 'SVG', 'PDF', 'CSV']
    });
    
    this.visualizationTypes.set('3D_NETWORK', {
      id: '3D_NETWORK',
      name: '3D Network Visualization',
      description: 'Three-dimensional network visualization with WebGL',
      category: 'NETWORK_3D',
      engines: ['THREE_JS', 'FORCE_GRAPH_3D'],
      layouts: ['FORCE_3D', 'SPHERE', 'CUBE'],
      features: ['rotate', 'zoom', 'select', 'fly_to', 'animate'],
      dataTypes: ['nodes', 'edges'],
      renderModes: ['WEBGL'],
      interactionTypes: ['node_click', 'camera_move', 'selection_change'],
      exportFormats: ['PNG', 'GLTF']
    });
    
    this.visualizationTypes.set('DASHBOARD_GRID', {
      id: 'DASHBOARD_GRID',
      name: 'Dashboard Grid',
      description: 'Multi-widget dashboard with responsive grid layout',
      category: 'DASHBOARD',
      engines: ['CUSTOM_GRID', 'REACT_GRID'],
      layouts: ['RESPONSIVE_GRID', 'FIXED_GRID', 'MASONRY'],
      features: ['drag_drop', 'resize', 'filter', 'refresh'],
      dataTypes: ['widgets', 'metrics'],
      renderModes: ['HTML'],
      interactionTypes: ['widget_resize', 'widget_move', 'refresh_widget'],
      exportFormats: ['PNG', 'PDF']
    });
  }
  
  initializeRenderingEngines() {
    this.renderingEngines.set('CYTOSCAPE', {
      id: 'CYTOSCAPE',
      name: 'Cytoscape.js',
      description: 'Graph theory library for network visualization',
      capabilities: ['network_graphs', 'layouts', 'animations', 'extensions'],
      performance: 'HIGH',
      maxNodes: 10000,
      renderer: this.renderCytoscape.bind(this)
    });
    
    this.renderingEngines.set('D3_FORCE', {
      id: 'D3_FORCE',
      name: 'D3.js Force Simulation',
      description: 'Physics-based force simulation for networks',
      capabilities: ['force_simulation', 'custom_layouts', 'animations'],
      performance: 'MEDIUM',
      maxNodes: 5000,
      renderer: this.renderD3Force.bind(this)
    });
    
    this.renderingEngines.set('THREE_JS', {
      id: 'THREE_JS',
      name: 'Three.js WebGL',
      description: '3D graphics library with WebGL acceleration',
      capabilities: ['3d_visualization', 'webgl', 'animations', 'vr_support'],
      performance: 'HIGH',
      maxNodes: 50000,
      renderer: this.renderThreeJS.bind(this)
    });
    
    this.renderingEngines.set('VIS_TIMELINE', {
      id: 'VIS_TIMELINE',
      name: 'Vis.js Timeline',
      description: 'Interactive timeline component',
      capabilities: ['timeline', 'gantt', 'groups', 'zoom'],
      performance: 'MEDIUM',
      maxItems: 10000,
      renderer: this.renderVisTimeline.bind(this)
    });
    
    this.renderingEngines.set('LEAFLET', {
      id: 'LEAFLET',
      name: 'Leaflet Maps',
      description: 'Lightweight mapping library',
      capabilities: ['maps', 'markers', 'clustering', 'heatmaps'],
      performance: 'HIGH',
      maxMarkers: 100000,
      renderer: this.renderLeaflet.bind(this)
    });
    
    this.renderingEngines.set('PLOTLY', {
      id: 'PLOTLY',
      name: 'Plotly.js',
      description: 'Scientific charting library',
      capabilities: ['statistical_charts', '3d_plots', 'animations', 'interactivity'],
      performance: 'MEDIUM',
      maxDataPoints: 1000000,
      renderer: this.renderPlotly.bind(this)
    });
  }
  
  initializeLayoutAlgorithms() {
    this.layoutAlgorithms.set('FORCE_DIRECTED', {
      id: 'FORCE_DIRECTED',
      name: 'Force-Directed Layout',
      description: 'Physics-based node positioning using attractive and repulsive forces',
      category: 'PHYSICS',
      parameters: {
        linkDistance: { type: 'number', default: 100, min: 10, max: 500 },
        linkStrength: { type: 'number', default: 1, min: 0, max: 2 },
        charge: { type: 'number', default: -300, min: -1000, max: 0 },
        gravity: { type: 'number', default: 0.1, min: 0, max: 1 },
        iterations: { type: 'integer', default: 100, min: 10, max: 1000 }
      },
      suitableFor: ['network_graphs', 'small_to_medium_networks'],
      calculator: this.calculateForceDirectedLayout.bind(this)
    });
    
    this.layoutAlgorithms.set('HIERARCHICAL', {
      id: 'HIERARCHICAL',
      name: 'Hierarchical Layout',
      description: 'Tree-like arrangement with clear parent-child relationships',
      category: 'TREE',
      parameters: {
        direction: { type: 'enum', options: ['UD', 'DU', 'LR', 'RL'], default: 'UD' },
        levelSeparation: { type: 'number', default: 150, min: 50, max: 500 },
        nodeSeparation: { type: 'number', default: 100, min: 20, max: 300 },
        treeSpacing: { type: 'number', default: 200, min: 100, max: 500 }
      },
      suitableFor: ['trees', 'dags', 'organizational_charts'],
      calculator: this.calculateHierarchicalLayout.bind(this)
    });
    
    this.layoutAlgorithms.set('CIRCULAR', {
      id: 'CIRCULAR',
      name: 'Circular Layout',
      description: 'Nodes arranged in concentric circles',
      category: 'GEOMETRIC',
      parameters: {
        radius: { type: 'number', default: 200, min: 50, max: 1000 },
        startAngle: { type: 'number', default: 0, min: 0, max: 360 },
        sweep: { type: 'number', default: 360, min: 90, max: 360 },
        equidistant: { type: 'boolean', default: true }
      },
      suitableFor: ['small_networks', 'showcase_layouts'],
      calculator: this.calculateCircularLayout.bind(this)
    });
    
    this.layoutAlgorithms.set('GRID', {
      id: 'GRID',
      name: 'Grid Layout',
      description: 'Regular grid arrangement of nodes',
      category: 'GEOMETRIC',
      parameters: {
        rows: { type: 'integer', default: 0, min: 0, max: 100 },
        columns: { type: 'integer', default: 0, min: 0, max: 100 },
        spacing: { type: 'number', default: 100, min: 20, max: 200 }
      },
      suitableFor: ['matrix_data', 'regular_structures'],
      calculator: this.calculateGridLayout.bind(this)
    });
    
    this.layoutAlgorithms.set('COMMUNITY_BASED', {
      id: 'COMMUNITY_BASED',
      name: 'Community-Based Layout',
      description: 'Layout based on detected community structure',
      category: 'ANALYTICAL',
      parameters: {
        communitySpacing: { type: 'number', default: 300, min: 100, max: 800 },
        internalSpacing: { type: 'number', default: 50, min: 10, max: 200 },
        algorithm: { type: 'enum', options: ['louvain', 'leiden', 'label_propagation'], default: 'louvain' }
      },
      suitableFor: ['social_networks', 'clustered_data'],
      calculator: this.calculateCommunityLayout.bind(this)
    });
  }
  
  initializeStyleThemes() {
    this.styleThemes.set('PROFESSIONAL', {
      id: 'PROFESSIONAL',
      name: 'Professional Theme',
      description: 'Clean, business-appropriate styling',
      nodeStyles: {
        default: {
          backgroundColor: '#3498db',
          borderColor: '#2980b9',
          borderWidth: 2,
          color: '#ffffff',
          fontSize: 12,
          shape: 'ellipse'
        },
        highlighted: {
          backgroundColor: '#e74c3c',
          borderColor: '#c0392b',
          borderWidth: 3,
          color: '#ffffff',
          fontSize: 14
        },
        selected: {
          backgroundColor: '#f39c12',
          borderColor: '#e67e22',
          borderWidth: 3,
          color: '#ffffff'
        }
      },
      edgeStyles: {
        default: {
          lineColor: '#7f8c8d',
          width: 2,
          targetArrowColor: '#7f8c8d',
          targetArrowShape: 'triangle'
        },
        highlighted: {
          lineColor: '#e74c3c',
          width: 3,
          targetArrowColor: '#e74c3c'
        }
      },
      backgroundColor: '#ffffff',
      gridColor: '#ecf0f1'
    });
    
    this.styleThemes.set('DARK_MODE', {
      id: 'DARK_MODE',
      name: 'Dark Mode Theme',
      description: 'Dark theme for low-light environments',
      nodeStyles: {
        default: {
          backgroundColor: '#34495e',
          borderColor: '#2c3e50',
          borderWidth: 2,
          color: '#ecf0f1',
          fontSize: 12,
          shape: 'ellipse'
        },
        highlighted: {
          backgroundColor: '#e67e22',
          borderColor: '#d35400',
          borderWidth: 3,
          color: '#ffffff',
          fontSize: 14
        },
        selected: {
          backgroundColor: '#9b59b6',
          borderColor: '#8e44ad',
          borderWidth: 3,
          color: '#ffffff'
        }
      },
      edgeStyles: {
        default: {
          lineColor: '#95a5a6',
          width: 2,
          targetArrowColor: '#95a5a6',
          targetArrowShape: 'triangle'
        },
        highlighted: {
          lineColor: '#f39c12',
          width: 3,
          targetArrowColor: '#f39c12'
        }
      },
      backgroundColor: '#2c3e50',
      gridColor: '#34495e'
    });
    
    this.styleThemes.set('SECURITY_FOCUSED', {
      id: 'SECURITY_FOCUSED',
      name: 'Security Analysis Theme',
      description: 'Theme optimized for security and threat analysis',
      nodeStyles: {
        default: {
          backgroundColor: '#27ae60',
          borderColor: '#229954',
          borderWidth: 2,
          color: '#ffffff',
          fontSize: 11,
          shape: 'ellipse'
        },
        suspicious: {
          backgroundColor: '#f39c12',
          borderColor: '#e67e22',
          borderWidth: 3,
          color: '#ffffff',
          fontSize: 12
        },
        threat: {
          backgroundColor: '#e74c3c',
          borderColor: '#c0392b',
          borderWidth: 4,
          color: '#ffffff',
          fontSize: 13
        },
        critical: {
          backgroundColor: '#8b0000',
          borderColor: '#660000',
          borderWidth: 4,
          color: '#ffffff',
          fontSize: 14
        }
      },
      edgeStyles: {
        default: {
          lineColor: '#95a5a6',
          width: 1,
          targetArrowColor: '#95a5a6'
        },
        suspicious: {
          lineColor: '#f39c12',
          width: 2,
          targetArrowColor: '#f39c12',
          lineStyle: 'dashed'
        },
        threat: {
          lineColor: '#e74c3c',
          width: 3,
          targetArrowColor: '#e74c3c'
        }
      },
      backgroundColor: '#fafafa',
      gridColor: '#e8e8e8'
    });
    
    this.styleThemes.set('TEMPORAL', {
      id: 'TEMPORAL',
      name: 'Temporal Analysis Theme',
      description: 'Color-coded theme for temporal data analysis',
      nodeStyles: {
        default: {
          backgroundColor: '#3498db',
          borderColor: '#2980b9',
          borderWidth: 2,
          color: '#ffffff',
          fontSize: 11,
          shape: 'ellipse'
        },
        recent: {
          backgroundColor: '#2ecc71',
          borderColor: '#27ae60',
          borderWidth: 2
        },
        old: {
          backgroundColor: '#95a5a6',
          borderColor: '#7f8c8d',
          borderWidth: 2
        },
        future: {
          backgroundColor: '#9b59b6',
          borderColor: '#8e44ad',
          borderWidth: 2,
          lineStyle: 'dashed'
        }
      },
      timelineColors: {
        gradient: ['#3498db', '#2ecc71', '#f39c12', '#e74c3c'],
        background: '#ffffff',
        axis: '#34495e',
        grid: '#ecf0f1'
      }
    });
  }
  
  initializeInteractionHandlers() {
    this.interactionHandlers.set('node_click', {
      name: 'Node Click Handler',
      description: 'Handles single clicks on nodes',
      handler: this.handleNodeClick.bind(this),
      events: ['click', 'tap']
    });
    
    this.interactionHandlers.set('node_hover', {
      name: 'Node Hover Handler',
      description: 'Handles mouse hover over nodes',
      handler: this.handleNodeHover.bind(this),
      events: ['mouseover', 'mouseout']
    });
    
    this.interactionHandlers.set('edge_select', {
      name: 'Edge Selection Handler',
      description: 'Handles edge selection events',
      handler: this.handleEdgeSelect.bind(this),
      events: ['select', 'unselect']
    });
    
    this.interactionHandlers.set('viewport_change', {
      name: 'Viewport Change Handler',
      description: 'Handles zoom and pan operations',
      handler: this.handleViewportChange.bind(this),
      events: ['zoom', 'pan', 'viewport']
    });
    
    this.interactionHandlers.set('selection_change', {
      name: 'Selection Change Handler',
      description: 'Handles multi-selection operations',
      handler: this.handleSelectionChange.bind(this),
      events: ['box_select', 'lasso_select']
    });
    
    this.interactionHandlers.set('layout_complete', {
      name: 'Layout Completion Handler',
      description: 'Handles layout algorithm completion',
      handler: this.handleLayoutComplete.bind(this),
      events: ['layout_stop', 'layout_ready']
    });
  }
  
  initializeTemplates() {
    this.templates.set('INVESTIGATION_NETWORK', {
      id: 'INVESTIGATION_NETWORK',
      name: 'Investigation Network Template',
      description: 'Standard network visualization for investigations',
      visualization_type: 'NETWORK_GRAPH',
      default_engine: 'CYTOSCAPE',
      default_layout: 'FORCE_DIRECTED',
      default_theme: 'PROFESSIONAL',
      configuration: {
        physics: true,
        clustering: {
          enabled: true,
          threshold: 50
        },
        filters: {
          nodeTypes: true,
          edgeTypes: true,
          dateRange: true
        },
        interactions: {
          expandable: true,
          searchable: true,
          exportable: true
        }
      }
    });
    
    this.templates.set('TEMPORAL_ANALYSIS', {
      id: 'TEMPORAL_ANALYSIS',
      name: 'Temporal Analysis Template',
      description: 'Timeline visualization for temporal analysis',
      visualization_type: 'TIMELINE',
      default_engine: 'VIS_TIMELINE',
      default_layout: 'LINEAR',
      default_theme: 'TEMPORAL',
      configuration: {
        zoomable: true,
        grouping: {
          enabled: true,
          field: 'category'
        },
        filtering: {
          dateRange: true,
          categories: true
        }
      }
    });
    
    this.templates.set('GEOGRAPHIC_INTELLIGENCE', {
      id: 'GEOGRAPHIC_INTELLIGENCE',
      name: 'Geographic Intelligence Template',
      description: 'Map visualization for geographic analysis',
      visualization_type: 'GEOSPATIAL_MAP',
      default_engine: 'LEAFLET',
      default_layout: 'STREET',
      default_theme: 'PROFESSIONAL',
      configuration: {
        clustering: {
          enabled: true,
          maxZoom: 15
        },
        heatmap: {
          enabled: true,
          radius: 25
        },
        layers: {
          markers: true,
          routes: true,
          areas: true
        }
      }
    });
    
    this.templates.set('RISK_DASHBOARD', {
      id: 'RISK_DASHBOARD',
      name: 'Risk Assessment Dashboard',
      description: 'Multi-widget dashboard for risk analysis',
      visualization_type: 'DASHBOARD_GRID',
      default_engine: 'CUSTOM_GRID',
      default_layout: 'RESPONSIVE_GRID',
      default_theme: 'SECURITY_FOCUSED',
      configuration: {
        widgets: [
          { type: 'risk_meter', position: { x: 0, y: 0, w: 2, h: 2 } },
          { type: 'threat_timeline', position: { x: 2, y: 0, w: 4, h: 2 } },
          { type: 'entity_network', position: { x: 0, y: 2, w: 6, h: 3 } },
          { type: 'alert_feed', position: { x: 6, y: 0, w: 2, h: 5 } }
        ],
        refreshInterval: 30000
      }
    });
  }
  
  // Core visualization methods
  async createVisualization(visualizationRequest) {
    const visualizationId = uuidv4();
    const startTime = Date.now();
    
    const visualization = {
      id: visualizationId,
      type: visualizationRequest.type,
      engine: visualizationRequest.engine || this.getDefaultEngine(visualizationRequest.type),
      layout: visualizationRequest.layout || 'FORCE_DIRECTED',
      theme: visualizationRequest.theme || 'PROFESSIONAL',
      template: visualizationRequest.template,
      configuration: visualizationRequest.configuration || {},
      data: {},
      status: 'INITIALIZING',
      createdAt: new Date(),
      createdBy: visualizationRequest.userId,
      renderTime: 0,
      interactive: visualizationRequest.interactive !== false
    };
    
    this.visualizations.set(visualizationId, visualization);
    this.metrics.totalVisualizations++;
    
    try {
      // Load and process data
      visualization.status = 'LOADING_DATA';
      visualization.data = await this.loadVisualizationData(visualizationRequest);
      
      // Apply template if specified
      if (visualization.template) {
        await this.applyTemplate(visualization);
      }
      
      // Generate visualization specification
      visualization.status = 'GENERATING';
      visualization.specification = await this.generateVisualizationSpec(visualization);
      
      // Render visualization
      visualization.status = 'RENDERING';
      visualization.rendered = await this.renderVisualization(visualization);
      
      visualization.status = 'COMPLETED';
      visualization.renderTime = Date.now() - startTime;
      
      this.metrics.renderedVisualizations++;
      this.updateRenderTimeMetric(visualization.renderTime);
      
      if (visualization.interactive) {
        this.metrics.interactiveViews++;
      }
      
      // Track popular types
      if (!this.metrics.popularTypes.has(visualization.type)) {
        this.metrics.popularTypes.set(visualization.type, 0);
      }
      this.metrics.popularTypes.set(
        visualization.type,
        this.metrics.popularTypes.get(visualization.type) + 1
      );
      
      this.emit('visualizationCreated', visualization);
      return visualization;
      
    } catch (error) {
      visualization.status = 'FAILED';
      visualization.error = error.message;
      this.logger.error('Visualization creation failed:', error);
      throw error;
    }
  }
  
  async loadVisualizationData(request) {
    const session = this.neo4jDriver.session();
    try {
      switch (request.type) {
        case 'NETWORK_GRAPH':
          return await this.loadNetworkData(request, session);
        case 'TIMELINE':
          return await this.loadTimelineData(request, session);
        case 'GEOSPATIAL_MAP':
          return await this.loadGeospatialData(request, session);
        case 'SANKEY_DIAGRAM':
          return await this.loadFlowData(request, session);
        case 'TREEMAP':
          return await this.loadHierarchicalData(request, session);
        case 'HEATMAP':
          return await this.loadMatrixData(request, session);
        case '3D_NETWORK':
          return await this.loadNetwork3DData(request, session);
        case 'DASHBOARD_GRID':
          return await this.loadDashboardData(request, session);
        default:
          throw new Error(`Unsupported visualization type: ${request.type}`);
      }
    } finally {
      await session.close();
    }
  }
  
  async loadNetworkData(request, session) {
    const { investigationId, filters = {}, maxNodes = 1000 } = request.parameters || {};
    
    let nodeFilter = '';
    let edgeFilter = '';
    const queryParams = { investigationId, maxNodes };
    
    if (filters.nodeTypes && filters.nodeTypes.length > 0) {
      nodeFilter += 'AND n.type IN $nodeTypes';
      queryParams.nodeTypes = filters.nodeTypes;
    }
    
    if (filters.dateRange) {
      nodeFilter += 'AND n.createdAt >= $startDate AND n.createdAt <= $endDate';
      queryParams.startDate = filters.dateRange.start;
      queryParams.endDate = filters.dateRange.end;
    }
    
    // Load nodes
    const nodeQuery = `
      MATCH (n:MultimodalEntity)
      WHERE n.investigationId = $investigationId ${nodeFilter}
      RETURN n
      LIMIT $maxNodes
    `;
    
    const nodeResult = await session.run(nodeQuery, queryParams);
    const nodes = nodeResult.records.map(record => {
      const node = record.get('n').properties;
      return {
        id: node.id,
        label: node.label || node.id,
        type: node.type,
        properties: node,
        group: this.getNodeGroup(node),
        size: this.calculateNodeSize(node),
        color: this.getNodeColor(node.type)
      };
    });
    
    const nodeIds = nodes.map(n => n.id);
    
    // Load edges
    const edgeQuery = `
      MATCH (a:MultimodalEntity)-[r]-(b:MultimodalEntity)
      WHERE a.investigationId = $investigationId 
      AND b.investigationId = $investigationId
      AND a.id IN $nodeIds AND b.id IN $nodeIds
      ${edgeFilter}
      RETURN DISTINCT a.id as source, b.id as target, r
    `;
    
    queryParams.nodeIds = nodeIds;
    const edgeResult = await session.run(edgeQuery, queryParams);
    const edges = edgeResult.records.map(record => {
      const relationship = record.get('r').properties;
      return {
        id: `${record.get('source')}-${record.get('target')}`,
        source: record.get('source'),
        target: record.get('target'),
        type: relationship.type || 'CONNECTED',
        weight: relationship.weight || 1,
        properties: relationship,
        color: this.getEdgeColor(relationship.type),
        width: this.calculateEdgeWidth(relationship.weight)
      };
    });
    
    return {
      nodes,
      edges,
      statistics: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        nodeTypes: [...new Set(nodes.map(n => n.type))],
        edgeTypes: [...new Set(edges.map(e => e.type))]
      }
    };
  }
  
  async loadTimelineData(request, session) {
    const { investigationId, groupBy = 'type' } = request.parameters || {};
    
    const timelineQuery = `
      MATCH (e:MultimodalEntity)
      WHERE e.investigationId = $investigationId
      AND e.createdAt IS NOT NULL
      RETURN e.id as id,
             e.label as label,
             e.type as type,
             e.createdAt as timestamp,
             e.properties as properties
      ORDER BY e.createdAt ASC
    `;
    
    const result = await session.run(timelineQuery, { investigationId });
    const items = result.records.map(record => ({
      id: record.get('id'),
      content: record.get('label'),
      start: new Date(record.get('timestamp')),
      type: 'point',
      group: record.get(groupBy),
      className: `timeline-${record.get('type').toLowerCase()}`,
      title: `${record.get('type')}: ${record.get('label')}`
    }));
    
    const groups = [...new Set(items.map(item => item.group))].map(group => ({
      id: group,
      content: group,
      className: `group-${group.toLowerCase()}`
    }));
    
    return {
      items,
      groups,
      options: {
        orientation: 'top',
        stack: true,
        zoomable: true,
        moveable: true,
        showCurrentTime: true
      }
    };
  }
  
  async loadGeospatialData(request, session) {
    const { investigationId, clusterRadius = 50 } = request.parameters || {};
    
    const geoQuery = `
      MATCH (e:MultimodalEntity)
      WHERE e.investigationId = $investigationId
      AND e.latitude IS NOT NULL
      AND e.longitude IS NOT NULL
      RETURN e.id as id,
             e.label as label,
             e.type as type,
             e.latitude as latitude,
             e.longitude as longitude,
             e.properties as properties
    `;
    
    const result = await session.run(geoQuery, { investigationId });
    const markers = result.records.map(record => ({
      id: record.get('id'),
      position: [record.get('latitude'), record.get('longitude')],
      popup: `<b>${record.get('label')}</b><br>Type: ${record.get('type')}`,
      icon: this.getMapIcon(record.get('type')),
      properties: record.get('properties')
    }));
    
    return {
      markers,
      center: this.calculateMapCenter(markers),
      zoom: this.calculateOptimalZoom(markers),
      clustering: {
        enabled: true,
        radius: clusterRadius
      },
      heatmap: {
        data: markers.map(m => [m.position[0], m.position[1], 1])
      }
    };
  }
  
  async generateVisualizationSpec(visualization) {
    const engine = this.renderingEngines.get(visualization.engine);
    if (!engine) {
      throw new Error(`Unknown rendering engine: ${visualization.engine}`);
    }
    
    const layout = this.layoutAlgorithms.get(visualization.layout);
    const theme = this.styleThemes.get(visualization.theme);
    
    const spec = {
      engine: visualization.engine,
      type: visualization.type,
      data: visualization.data,
      layout: {
        algorithm: visualization.layout,
        parameters: layout?.parameters || {},
        positions: await this.calculateLayout(visualization)
      },
      style: {
        theme: visualization.theme,
        nodes: theme?.nodeStyles || {},
        edges: theme?.edgeStyles || {},
        background: theme?.backgroundColor || '#ffffff'
      },
      interactions: this.getInteractionSpec(visualization),
      features: this.getFeatureSpec(visualization)
    };
    
    return spec;
  }
  
  async calculateLayout(visualization) {
    const algorithm = this.layoutAlgorithms.get(visualization.layout);
    if (!algorithm || !algorithm.calculator) {
      return null;
    }
    
    return await algorithm.calculator(visualization.data, visualization.configuration);
  }
  
  async renderVisualization(visualization) {
    const engine = this.renderingEngines.get(visualization.engine);
    if (!engine || !engine.renderer) {
      throw new Error(`No renderer available for engine: ${visualization.engine}`);
    }
    
    return await engine.renderer(visualization);
  }
  
  // Rendering engine implementations
  async renderCytoscape(visualization) {
    const { nodes, edges } = visualization.data;
    const spec = visualization.specification;
    
    const cytoscapeConfig = {
      container: `#visualization-${visualization.id}`,
      elements: [
        ...nodes.map(node => ({
          data: { ...node, id: node.id },
          position: spec.layout.positions?.[node.id] || { x: 0, y: 0 },
          style: this.applyCytoscapeNodeStyle(node, spec.style.nodes)
        })),
        ...edges.map(edge => ({
          data: { ...edge, source: edge.source, target: edge.target },
          style: this.applyCytoscapeEdgeStyle(edge, spec.style.edges)
        }))
      ],
      style: this.generateCytoscapeStyles(spec.style),
      layout: { name: 'preset' }, // Use pre-calculated positions
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: true
    };
    
    return {
      type: 'cytoscape',
      config: cytoscapeConfig,
      interactions: spec.interactions
    };
  }
  
  async renderD3Force(visualization) {
    const { nodes, edges } = visualization.data;
    const spec = visualization.specification;
    
    const d3Config = {
      nodes: nodes.map(node => ({
        ...node,
        x: spec.layout.positions?.[node.id]?.x || 0,
        y: spec.layout.positions?.[node.id]?.y || 0,
        fx: null,
        fy: null
      })),
      links: edges.map(edge => ({
        ...edge,
        source: edge.source,
        target: edge.target
      })),
      simulation: {
        alphaDecay: 0.0228,
        velocityDecay: 0.4,
        forces: {
          link: { distance: 100, strength: 0.6 },
          charge: { strength: -300 },
          center: { x: 0, y: 0 }
        }
      },
      styling: spec.style
    };
    
    return {
      type: 'd3-force',
      config: d3Config,
      interactions: spec.interactions
    };
  }
  
  async renderThreeJS(visualization) {
    const { nodes, edges } = visualization.data;
    const spec = visualization.specification;
    
    const threeConfig = {
      nodes: nodes.map(node => ({
        ...node,
        position: spec.layout.positions?.[node.id] || { x: 0, y: 0, z: 0 },
        geometry: this.getNodeGeometry(node),
        material: this.getNodeMaterial(node, spec.style.nodes)
      })),
      edges: edges.map(edge => ({
        ...edge,
        geometry: 'line',
        material: this.getEdgeMaterial(edge, spec.style.edges)
      })),
      camera: {
        position: { x: 0, y: 0, z: 1000 },
        target: { x: 0, y: 0, z: 0 }
      },
      controls: {
        enableRotate: true,
        enableZoom: true,
        enablePan: true
      },
      lighting: {
        ambient: { color: 0x404040, intensity: 0.4 },
        directional: { color: 0xffffff, intensity: 0.6, position: { x: 1, y: 1, z: 1 } }
      }
    };
    
    return {
      type: 'three-js',
      config: threeConfig,
      interactions: spec.interactions
    };
  }
  
  async renderVisTimeline(visualization) {
    const { items, groups, options } = visualization.data;
    const spec = visualization.specification;
    
    const timelineConfig = {
      items,
      groups,
      options: {
        ...options,
        ...spec.style.timelineOptions,
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      }
    };
    
    return {
      type: 'vis-timeline',
      config: timelineConfig,
      interactions: spec.interactions
    };
  }
  
  async renderLeaflet(visualization) {
    const { markers, center, zoom, clustering, heatmap } = visualization.data;
    const spec = visualization.specification;
    
    const mapConfig = {
      center,
      zoom,
      layers: [
        {
          type: 'tile',
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '© OpenStreetMap contributors'
        }
      ],
      markers: markers.map(marker => ({
        ...marker,
        style: this.getMarkerStyle(marker, spec.style)
      })),
      clustering: {
        enabled: clustering.enabled,
        options: {
          maxClusterRadius: clustering.radius,
          showCoverageOnHover: true
        }
      },
      heatmap: {
        enabled: !!heatmap,
        data: heatmap?.data || [],
        options: {
          radius: 25,
          blur: 15,
          maxZoom: 17
        }
      }
    };
    
    return {
      type: 'leaflet',
      config: mapConfig,
      interactions: spec.interactions
    };
  }
  
  async renderPlotly(visualization) {
    const spec = visualization.specification;
    
    const plotlyConfig = {
      data: this.transformDataForPlotly(visualization.data, visualization.type),
      layout: {
        title: visualization.title || 'Visualization',
        ...this.getPlotlyLayout(visualization.type, spec.style),
        ...visualization.configuration.layout
      },
      config: {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
        ...visualization.configuration.plotlyConfig
      }
    };
    
    return {
      type: 'plotly',
      config: plotlyConfig,
      interactions: spec.interactions
    };
  }
  
  // Layout calculation methods
  async calculateForceDirectedLayout(data, configuration = {}) {
    const { nodes, edges } = data;
    const positions = {};
    
    // Simplified force-directed layout calculation
    // In production, this would use a proper physics simulation
    const centerX = 0;
    const centerY = 0;
    const radius = Math.sqrt(nodes.length) * 50;
    
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      positions[node.id] = {
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 100,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 100
      };
    });
    
    return positions;
  }
  
  async calculateHierarchicalLayout(data, configuration = {}) {
    const { nodes, edges } = data;
    const positions = {};
    
    // Build hierarchy from edges
    const hierarchy = this.buildHierarchy(nodes, edges);
    
    // Calculate positions based on hierarchy levels
    const levelHeight = configuration.levelSeparation || 150;
    const nodeSpacing = configuration.nodeSeparation || 100;
    
    Object.entries(hierarchy.levels).forEach(([level, levelNodes]) => {
      const y = parseInt(level) * levelHeight;
      const totalWidth = (levelNodes.length - 1) * nodeSpacing;
      const startX = -totalWidth / 2;
      
      levelNodes.forEach((nodeId, index) => {
        positions[nodeId] = {
          x: startX + index * nodeSpacing,
          y: y
        };
      });
    });
    
    return positions;
  }
  
  async calculateCircularLayout(data, configuration = {}) {
    const { nodes } = data;
    const positions = {};
    
    const radius = configuration.radius || 200;
    const startAngle = (configuration.startAngle || 0) * Math.PI / 180;
    const sweep = (configuration.sweep || 360) * Math.PI / 180;
    
    nodes.forEach((node, index) => {
      const angle = startAngle + (index / nodes.length) * sweep;
      positions[node.id] = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      };
    });
    
    return positions;
  }
  
  // Interaction handlers
  async handleNodeClick(event, visualization) {
    const { node, originalEvent } = event;
    
    this.emit('nodeClick', {
      visualizationId: visualization.id,
      nodeId: node.id,
      node: node,
      position: originalEvent ? { x: originalEvent.clientX, y: originalEvent.clientY } : null
    });
    
    // Expand node if configured
    if (visualization.configuration.expandable) {
      await this.expandNode(visualization.id, node.id);
    }
  }
  
  async handleNodeHover(event, visualization) {
    const { node, eventType } = event;
    
    this.emit('nodeHover', {
      visualizationId: visualization.id,
      nodeId: node.id,
      node: node,
      eventType: eventType // 'enter' or 'leave'
    });
  }
  
  async handleEdgeSelect(event, visualization) {
    const { edge, selected } = event;
    
    this.emit('edgeSelect', {
      visualizationId: visualization.id,
      edgeId: edge.id,
      edge: edge,
      selected: selected
    });
  }
  
  async handleViewportChange(event, visualization) {
    const { zoom, pan } = event;
    
    this.emit('viewportChange', {
      visualizationId: visualization.id,
      zoom: zoom,
      pan: pan
    });
  }
  
  async handleSelectionChange(event, visualization) {
    const { selected, unselected } = event;
    
    this.emit('selectionChange', {
      visualizationId: visualization.id,
      selected: selected,
      unselected: unselected,
      totalSelected: selected.length
    });
  }
  
  async handleLayoutComplete(event, visualization) {
    this.emit('layoutComplete', {
      visualizationId: visualization.id,
      layout: visualization.layout,
      duration: event.duration
    });
  }
  
  // Export functionality
  async exportVisualization(visualizationId, format, options = {}) {
    const visualization = this.visualizations.get(visualizationId);
    if (!visualization) {
      throw new Error('Visualization not found');
    }
    
    const exportData = {
      id: uuidv4(),
      visualizationId,
      format,
      options,
      createdAt: new Date(),
      status: 'PROCESSING'
    };
    
    try {
      switch (format.toUpperCase()) {
        case 'PNG':
          exportData.result = await this.exportToPNG(visualization, options);
          break;
        case 'SVG':
          exportData.result = await this.exportToSVG(visualization, options);
          break;
        case 'PDF':
          exportData.result = await this.exportToPDF(visualization, options);
          break;
        case 'JSON':
          exportData.result = await this.exportToJSON(visualization, options);
          break;
        case 'GEXF':
          exportData.result = await this.exportToGEXF(visualization, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      
      exportData.status = 'COMPLETED';
      this.metrics.exportedVisualizations++;
      
    } catch (error) {
      exportData.status = 'FAILED';
      exportData.error = error.message;
      throw error;
    }
    
    return exportData;
  }
  
  // Helper methods
  getDefaultEngine(visualizationType) {
    const vizType = this.visualizationTypes.get(visualizationType);
    return vizType?.engines[0] || 'CYTOSCAPE';
  }
  
  getInteractionSpec(visualization) {
    const vizType = this.visualizationTypes.get(visualization.type);
    const interactions = {};
    
    if (vizType && visualization.interactive) {
      vizType.interactionTypes.forEach(interactionType => {
        const handler = this.interactionHandlers.get(interactionType);
        if (handler) {
          interactions[interactionType] = {
            enabled: true,
            handler: handler.handler,
            events: handler.events
          };
        }
      });
    }
    
    return interactions;
  }
  
  getFeatureSpec(visualization) {
    const vizType = this.visualizationTypes.get(visualization.type);
    const features = {};
    
    if (vizType) {
      vizType.features.forEach(feature => {
        features[feature] = visualization.configuration[feature] !== false;
      });
    }
    
    return features;
  }
  
  getNodeGroup(node) {
    return node.type || 'default';
  }
  
  calculateNodeSize(node) {
    // Base size on connection count or other properties
    const connectionCount = node.connectionCount || 1;
    return Math.min(Math.max(Math.log(connectionCount + 1) * 10, 10), 50);
  }
  
  getNodeColor(nodeType) {
    const colorMap = {
      PERSON: '#3498db',
      ORGANIZATION: '#e74c3c',
      LOCATION: '#2ecc71',
      EVENT: '#f39c12',
      DOCUMENT: '#9b59b6',
      default: '#95a5a6'
    };
    return colorMap[nodeType] || colorMap.default;
  }
  
  getEdgeColor(edgeType) {
    const colorMap = {
      KNOWS: '#3498db',
      WORKS_FOR: '#e74c3c',
      LOCATED_AT: '#2ecc71',
      PARTICIPATED_IN: '#f39c12',
      default: '#7f8c8d'
    };
    return colorMap[edgeType] || colorMap.default;
  }
  
  calculateEdgeWidth(weight) {
    return Math.min(Math.max(weight * 2, 1), 10);
  }
  
  updateRenderTimeMetric(renderTime) {
    const total = this.metrics.averageRenderTime * this.metrics.renderedVisualizations;
    this.metrics.averageRenderTime = (total + renderTime) / (this.metrics.renderedVisualizations + 1);
  }
  
  // Public API methods
  getVisualization(visualizationId) {
    return this.visualizations.get(visualizationId);
  }
  
  getAvailableTypes() {
    return Array.from(this.visualizationTypes.values());
  }
  
  getAvailableEngines() {
    return Array.from(this.renderingEngines.values());
  }
  
  getAvailableLayouts() {
    return Array.from(this.layoutAlgorithms.values());
  }
  
  getAvailableThemes() {
    return Array.from(this.styleThemes.values());
  }
  
  getAvailableTemplates() {
    return Array.from(this.templates.values());
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      activeVisualizations: this.visualizations.size,
      popularTypes: Object.fromEntries(this.metrics.popularTypes)
    };
  }
  
  // Placeholder methods for full implementation
  async applyTemplate(visualization) { }
  async expandNode(visualizationId, nodeId) { }
  async loadFlowData(request, session) { return { nodes: [], flows: [] }; }
  async loadHierarchicalData(request, session) { return { hierarchy: {}, values: [] }; }
  async loadMatrixData(request, session) { return { matrix: [], labels: [] }; }
  async loadNetwork3DData(request, session) { return { nodes: [], edges: [] }; }
  async loadDashboardData(request, session) { return { widgets: [] }; }
  applyCytoscapeNodeStyle(node, styles) { return styles.default || {}; }
  applyCytoscapeEdgeStyle(edge, styles) { return styles.default || {}; }
  generateCytoscapeStyles(style) { return []; }
  getNodeGeometry(node) { return 'sphere'; }
  getNodeMaterial(node, styles) { return { color: 0x3498db }; }
  getEdgeMaterial(edge, styles) { return { color: 0x7f8c8d }; }
  getMapIcon(type) { return 'default'; }
  calculateMapCenter(markers) { return [0, 0]; }
  calculateOptimalZoom(markers) { return 10; }
  getMarkerStyle(marker, style) { return {}; }
  transformDataForPlotly(data, type) { return []; }
  getPlotlyLayout(type, style) { return {}; }
  buildHierarchy(nodes, edges) { return { levels: {} }; }
  async exportToPNG(viz, opts) { return { path: '/tmp/viz.png' }; }
  async exportToSVG(viz, opts) { return { path: '/tmp/viz.svg' }; }
  async exportToPDF(viz, opts) { return { path: '/tmp/viz.pdf' }; }
  async exportToJSON(viz, opts) { return { data: viz.data }; }
  async exportToGEXF(viz, opts) { return { path: '/tmp/viz.gexf' }; }
  async calculateGridLayout(data, config) { return {}; }
  async calculateCommunityLayout(data, config) { return {}; }
}

module.exports = VisualizationService;