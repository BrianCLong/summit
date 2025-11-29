import {
  VisualizationExtension,
  VisualizationInput,
  VisualizationOutput,
  VisualizationMetadata,
  PluginContext,
} from '@summit/plugin-system';

/**
 * Network Graph Visualization Plugin
 *
 * Renders interactive force-directed network graphs using D3.js
 */
export default class NetworkVisualizationPlugin extends VisualizationExtension {
  private renderCount = 0;

  protected async onInitialize(context: PluginContext): Promise<void> {
    await super.onInitialize(context);
    this.log.info('Network Visualization Plugin initialized');
  }

  protected async onStart(): Promise<void> {
    await super.onStart();
    this.log.info('Network Visualization Plugin started');
  }

  protected async onStop(): Promise<void> {
    await super.onStop();
  }

  protected async onDestroy(): Promise<void> {
    await super.onDestroy();
  }

  /**
   * Render the visualization
   */
  async render(input: VisualizationInput): Promise<VisualizationOutput> {
    this.renderCount++;
    this.log.info('Rendering network visualization', {
      renderCount: this.renderCount,
      dataSize: JSON.stringify(input.data).length,
    });

    try {
      // Validate data
      if (!await this.canRender(input.data)) {
        throw new Error('Invalid data format for network visualization');
      }

      // Extract nodes and edges from data
      const { nodes, edges } = this.extractGraphData(input.data);

      // Generate visualization configuration
      const config = this.buildVisualizationConfig(nodes, edges, input);

      // Build HTML for web component
      const html = this.generateHTML(config, input);
      const script = this.generateScript(config, input);
      const style = this.generateCSS(input.theme);

      return {
        type: 'html',
        component: {
          html,
          script,
          style,
          props: {
            nodes,
            edges,
            config: input.config,
          },
        },
        assets: [
          {
            type: 'script',
            url: 'https://d3js.org/d3.v7.min.js',
            integrity: 'sha384-...',
            crossOrigin: 'anonymous',
          },
        ],
        sandbox: {
          allow: ['scripts'],
          csp: "default-src 'self'; script-src 'unsafe-inline' https://d3js.org;",
          featurePolicy: {
            geolocation: [],
            microphone: [],
            camera: [],
          },
        },
        accessibility: {
          ariaLabel: 'Interactive network graph visualization',
          description: `Network graph with ${nodes.length} nodes and ${edges.length} edges`,
          keyboardShortcuts: {
            '+': 'Zoom in',
            '-': 'Zoom out',
            'r': 'Reset view',
            'space': 'Pause/resume simulation',
          },
        },
      };
    } catch (error) {
      this.log.error('Failed to render visualization', error as Error);
      throw error;
    }
  }

  /**
   * Get visualization metadata
   */
  getMetadata(): VisualizationMetadata {
    return {
      name: 'Network Graph Visualization',
      description: 'Interactive force-directed network graph with zoom, pan, and filtering',
      version: '1.0.0',
      author: 'IntelGraph Team',
      category: 'graph',
      icon: 'https://example.com/icons/network.svg',
      thumbnail: 'https://example.com/thumbnails/network-graph.png',
      tags: ['network', 'graph', 'force-directed', 'interactive'],
      types: [
        {
          id: 'force-directed',
          name: 'Force-Directed Graph',
          description: 'Physics-based layout with attractive and repulsive forces',
          icon: 'force-icon',
        },
        {
          id: 'hierarchical',
          name: 'Hierarchical Layout',
          description: 'Tree-like hierarchical arrangement',
          icon: 'tree-icon',
        },
      ],
      supportedDataTypes: ['graph', 'network', 'entities-relationships'],
      configSchema: {
        type: 'object',
        properties: {
          layout: {
            type: 'string',
            enum: ['force-directed', 'hierarchical', 'circular'],
            default: 'force-directed',
          },
          showLabels: {
            type: 'boolean',
            default: true,
          },
          nodeSize: {
            type: 'number',
            minimum: 5,
            maximum: 50,
            default: 10,
          },
          edgeWidth: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            default: 2,
          },
        },
      },
      examples: [
        {
          name: 'Basic Network',
          description: 'Simple network with a few nodes',
          data: {
            nodes: [
              { id: '1', label: 'Node 1' },
              { id: '2', label: 'Node 2' },
              { id: '3', label: 'Node 3' },
            ],
            edges: [
              { source: '1', target: '2' },
              { source: '2', target: '3' },
            ],
          },
        },
      ],
    };
  }

  /**
   * Check if data can be rendered
   */
  async canRender(data: any): Promise<boolean> {
    if (!data) return false;

    // Check for nodes/edges format
    if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
      return data.nodes.length > 0;
    }

    // Check for entities/relationships format
    if (Array.isArray(data.entities) && Array.isArray(data.relationships)) {
      return data.entities.length > 0;
    }

    return false;
  }

  /**
   * Extract graph data from input
   */
  private extractGraphData(data: any): { nodes: GraphNode[]; edges: GraphEdge[] } {
    // Handle nodes/edges format
    if (data.nodes && data.edges) {
      return {
        nodes: data.nodes.map((n: any) => ({
          id: n.id,
          label: n.label || n.name || n.id,
          type: n.type,
          properties: n.properties || {},
        })),
        edges: data.edges.map((e: any) => ({
          source: e.source,
          target: e.target,
          label: e.label || e.type,
          properties: e.properties || {},
        })),
      };
    }

    // Handle entities/relationships format
    if (data.entities && data.relationships) {
      return {
        nodes: data.entities.map((e: any) => ({
          id: e.id,
          label: e.properties?.name || e.type,
          type: e.type,
          properties: e.properties || {},
        })),
        edges: data.relationships.map((r: any) => ({
          source: r.source,
          target: r.target,
          label: r.type,
          properties: r.properties || {},
        })),
      };
    }

    return { nodes: [], edges: [] };
  }

  /**
   * Build visualization configuration
   */
  private buildVisualizationConfig(
    nodes: GraphNode[],
    edges: GraphEdge[],
    input: VisualizationInput
  ): VisualizationConfig {
    const config = input.config || {};

    return {
      width: input.dimensions?.width || 800,
      height: input.dimensions?.height || 600,
      layout: config.layout || 'force-directed',
      showLabels: config.showLabels !== false,
      nodeSize: config.nodeSize || 10,
      edgeWidth: config.edgeWidth || 2,
      colorScheme: input.theme?.colorScheme || 'light',
      interactive: config.interactive !== false,
    };
  }

  /**
   * Generate HTML
   */
  private generateHTML(config: VisualizationConfig, input: VisualizationInput): string {
    return `
      <div id="network-viz" class="network-visualization">
        <div class="viz-toolbar">
          <button id="zoom-in" title="Zoom In">+</button>
          <button id="zoom-out" title="Zoom Out">−</button>
          <button id="reset" title="Reset View">⟲</button>
          <button id="pause" title="Pause/Resume">⏸</button>
        </div>
        <svg id="network-svg" width="${config.width}" height="${config.height}">
          <g class="zoom-container">
            <g class="edges"></g>
            <g class="nodes"></g>
            <g class="labels"></g>
          </g>
        </svg>
        <div class="viz-legend">
          <h4>Legend</h4>
          <div id="node-types"></div>
        </div>
      </div>
    `;
  }

  /**
   * Generate JavaScript
   */
  private generateScript(config: VisualizationConfig, input: VisualizationInput): string {
    return `
      (function() {
        const nodes = ${JSON.stringify(this.extractGraphData(input.data).nodes)};
        const edges = ${JSON.stringify(this.extractGraphData(input.data).edges)};
        const config = ${JSON.stringify(config)};

        // Initialize D3 visualization
        const svg = d3.select('#network-svg');
        const container = svg.select('.zoom-container');

        // Setup zoom behavior
        const zoom = d3.zoom()
          .scaleExtent([0.1, 10])
          .on('zoom', (event) => {
            container.attr('transform', event.transform);
          });

        svg.call(zoom);

        // Create force simulation
        const simulation = d3.forceSimulation(nodes)
          .force('link', d3.forceLink(edges).id(d => d.id).distance(100))
          .force('charge', d3.forceManyBody().strength(-300))
          .force('center', d3.forceCenter(config.width / 2, config.height / 2))
          .force('collision', d3.forceCollide().radius(config.nodeSize * 2));

        // Draw edges
        const edge = container.select('.edges')
          .selectAll('line')
          .data(edges)
          .enter()
          .append('line')
          .attr('stroke', '#999')
          .attr('stroke-width', config.edgeWidth)
          .attr('stroke-opacity', 0.6);

        // Draw nodes
        const node = container.select('.nodes')
          .selectAll('circle')
          .data(nodes)
          .enter()
          .append('circle')
          .attr('r', config.nodeSize)
          .attr('fill', d => getNodeColor(d.type))
          .call(d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded))
          .on('click', handleNodeClick);

        // Draw labels if enabled
        if (config.showLabels) {
          const label = container.select('.labels')
            .selectAll('text')
            .data(nodes)
            .enter()
            .append('text')
            .text(d => d.label)
            .attr('font-size', 12)
            .attr('dx', config.nodeSize + 5)
            .attr('dy', 4);

          simulation.on('tick', () => {
            edge
              .attr('x1', d => d.source.x)
              .attr('y1', d => d.source.y)
              .attr('x2', d => d.target.x)
              .attr('y2', d => d.target.y);

            node
              .attr('cx', d => d.x)
              .attr('cy', d => d.y);

            label
              .attr('x', d => d.x)
              .attr('y', d => d.y);
          });
        } else {
          simulation.on('tick', () => {
            edge
              .attr('x1', d => d.source.x)
              .attr('y1', d => d.source.y)
              .attr('x2', d => d.target.x)
              .attr('y2', d => d.target.y);

            node
              .attr('cx', d => d.x)
              .attr('cy', d => d.y);
          });
        }

        // Helper functions
        function getNodeColor(type) {
          const colors = {
            Person: '#4285F4',
            Organization: '#EA4335',
            Location: '#FBBC04',
            Event: '#34A853',
          };
          return colors[type] || '#999';
        }

        function dragStarted(event) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        }

        function dragged(event) {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        }

        function dragEnded(event) {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        }

        function handleNodeClick(event, d) {
          console.log('Node clicked:', d);
          // Emit event for interaction handling
        }

        // Toolbar controls
        d3.select('#zoom-in').on('click', () => {
          svg.transition().call(zoom.scaleBy, 1.3);
        });

        d3.select('#zoom-out').on('click', () => {
          svg.transition().call(zoom.scaleBy, 0.7);
        });

        d3.select('#reset').on('click', () => {
          svg.transition().call(zoom.transform, d3.zoomIdentity);
        });

        let paused = false;
        d3.select('#pause').on('click', () => {
          paused = !paused;
          if (paused) {
            simulation.stop();
          } else {
            simulation.restart();
          }
        });
      })();
    `;
  }

  /**
   * Generate CSS
   */
  private generateCSS(theme: any): string {
    const isDark = theme?.colorScheme === 'dark';

    return `
      .network-visualization {
        position: relative;
        font-family: ${theme?.fontFamily || 'sans-serif'};
        background: ${isDark ? '#1a1a1a' : '#ffffff'};
        color: ${isDark ? '#ffffff' : '#000000'};
      }

      .viz-toolbar {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 10;
        display: flex;
        gap: 5px;
      }

      .viz-toolbar button {
        width: 32px;
        height: 32px;
        border: 1px solid ${isDark ? '#444' : '#ccc'};
        background: ${isDark ? '#2a2a2a' : '#ffffff'};
        color: ${isDark ? '#ffffff' : '#000000'};
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
      }

      .viz-toolbar button:hover {
        background: ${isDark ? '#3a3a3a' : '#f5f5f5'};
      }

      .viz-legend {
        position: absolute;
        bottom: 10px;
        left: 10px;
        padding: 10px;
        background: ${isDark ? '#2a2a2a' : '#ffffff'};
        border: 1px solid ${isDark ? '#444' : '#ccc'};
        border-radius: 4px;
        font-size: 12px;
      }

      .viz-legend h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
      }

      #network-svg {
        border: 1px solid ${isDark ? '#444' : '#ccc'};
      }
    `;
  }
}

interface GraphNode {
  id: string;
  label: string;
  type?: string;
  properties: Record<string, any>;
}

interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  properties: Record<string, any>;
}

interface VisualizationConfig {
  width: number;
  height: number;
  layout: string;
  showLabels: boolean;
  nodeSize: number;
  edgeWidth: number;
  colorScheme: string;
  interactive: boolean;
}
