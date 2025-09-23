import * as d3 from 'd3';

/**
 * Custom D3.js Force-Directed Layout for Cytoscape
 */
export const d3ForceLayout = {
  name: 'd3-force',
  
  run: function(cy) {
    const nodes = cy.nodes().map(node => ({
      id: node.id(),
      x: node.position('x'),
      y: node.position('y'),
      node: node,
      radius: Math.max(15, (node.data('importance') || 1) * 10)
    }));

    const edges = cy.edges().map(edge => ({
      source: edge.source().id(),
      target: edge.target().id(),
      strength: edge.data('weight') || 0.5
    }));

    // Create D3 simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges)
        .id(d => d.id)
        .distance(d => 50 + (1 - d.strength) * 100)
        .strength(d => d.strength)
      )
      .force('charge', d3.forceManyBody()
        .strength(-300)
        .distanceMax(300)
      )
      .force('center', d3.forceCenter(
        cy.width() / 2,
        cy.height() / 2
      ))
      .force('collision', d3.forceCollide()
        .radius(d => d.radius + 5)
        .strength(0.7)
      )
      .alpha(0.3)
      .alphaDecay(0.02)
      .velocityDecay(0.3);

    // Animate the layout
    const animate = () => {
      simulation.tick();
      
      nodes.forEach(d => {
        d.node.position({
          x: d.x,
          y: d.y
        });
      });

      if (simulation.alpha() > 0.01) {
        requestAnimationFrame(animate);
      }
    };

    animate();

    return this;
  },

  stop: function() {
    return this;
  }
};

/**
 * Custom Hierarchical Layout using D3
 */
export const d3HierarchicalLayout = {
  name: 'd3-hierarchical',
  
  run: function(cy) {
    // Find root nodes (nodes with no incoming edges)
    const rootNodes = cy.nodes().filter(node => node.indegree() === 0);
    
    if (rootNodes.length === 0) {
      // If no root found, use highest degree node
      const highestDegreeNode = cy.nodes().max(node => node.degree()).ele;
      return this.createHierarchy(cy, highestDegreeNode);
    }

    // Create hierarchy for each root
    rootNodes.forEach(root => {
      this.createHierarchy(cy, root);
    });

    return this;
  },

  createHierarchy: function(cy, rootNode) {
    const visited = new Set();
    const levels = [];
    
    const traverse = (node, level) => {
      if (visited.has(node.id())) return;
      visited.add(node.id());
      
      if (!levels[level]) levels[level] = [];
      levels[level].push(node);
      
      // Traverse connected nodes
      node.connectedNodes().forEach(connected => {
        if (!visited.has(connected.id())) {
          traverse(connected, level + 1);
        }
      });
    };

    traverse(rootNode, 0);

    // Position nodes in hierarchy
    const containerWidth = cy.width();
    const containerHeight = cy.height();
    const levelHeight = containerHeight / (levels.length || 1);

    levels.forEach((levelNodes, level) => {
      const nodeWidth = containerWidth / (levelNodes.length || 1);
      
      levelNodes.forEach((node, index) => {
        node.position({
          x: (index + 0.5) * nodeWidth,
          y: (level + 0.5) * levelHeight
        });
      });
    });
  },

  stop: function() {
    return this;
  }
};

/**
 * Custom Circular Layout with Clustering
 */
export const d3CircularClusterLayout = {
  name: 'd3-circular-cluster',
  
  run: function(cy) {
    // Detect communities/clusters
    const clusters = this.detectClusters(cy);
    
    const centerX = cy.width() / 2;
    const centerY = cy.height() / 2;
    const mainRadius = Math.min(cy.width(), cy.height()) * 0.3;

    clusters.forEach((cluster, clusterIndex) => {
      const clusterAngle = (2 * Math.PI * clusterIndex) / clusters.length;
      const clusterCenterX = centerX + Math.cos(clusterAngle) * mainRadius;
      const clusterCenterY = centerY + Math.sin(clusterAngle) * mainRadius;
      const clusterRadius = Math.min(100, 20 + cluster.length * 5);

      cluster.forEach((node, nodeIndex) => {
        const nodeAngle = (2 * Math.PI * nodeIndex) / cluster.length;
        const x = clusterCenterX + Math.cos(nodeAngle) * clusterRadius;
        const y = clusterCenterY + Math.sin(nodeAngle) * clusterRadius;
        
        node.position({ x, y });
      });
    });

    return this;
  },

  detectClusters: function(cy) {
    const visited = new Set();
    const clusters = [];

    cy.nodes().forEach(node => {
      if (!visited.has(node.id())) {
        const cluster = [];
        const queue = [node];
        
        while (queue.length > 0) {
          const current = queue.shift();
          if (visited.has(current.id())) continue;
          
          visited.add(current.id());
          cluster.push(current);
          
          current.neighbors().nodes().forEach(neighbor => {
            if (!visited.has(neighbor.id())) {
              queue.push(neighbor);
            }
          });
        }
        
        clusters.push(cluster);
      }
    });

    return clusters;
  },

  stop: function() {
    return this;
  }
};

/**
 * Custom Timeline Layout for temporal data
 */
export const d3TimelineLayout = {
  name: 'd3-timeline',
  
  run: function(cy) {
    // Extract temporal information from nodes
    const nodesWithTime = cy.nodes().map(node => {
      const data = node.data();
      let timestamp = null;
      
      // Try to extract timestamp from various properties
      if (data.timestamp) timestamp = new Date(data.timestamp);
      else if (data.created_at) timestamp = new Date(data.created_at);
      else if (data.date) timestamp = new Date(data.date);
      else if (data.properties && data.properties.date) timestamp = new Date(data.properties.date);
      
      return {
        node,
        timestamp: timestamp || new Date(),
        data
      };
    });

    // Sort by timestamp
    nodesWithTime.sort((a, b) => a.timestamp - b.timestamp);

    // Create timeline scale
    const timeExtent = d3.extent(nodesWithTime, d => d.timestamp);
    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([50, cy.width() - 50]);

    // Group nodes by type for y-positioning
    const typeGroups = d3.group(nodesWithTime, d => d.data.type);
    const yScale = d3.scaleBand()
      .domain(Array.from(typeGroups.keys()))
      .range([50, cy.height() - 50])
      .padding(0.1);

    // Position nodes
    nodesWithTime.forEach(({ node, timestamp, data }) => {
      const x = xScale(timestamp);
      const baseY = yScale(data.type) || cy.height() / 2;
      
      // Add some random offset to avoid overlapping
      const y = baseY + (Math.random() - 0.5) * yScale.bandwidth() * 0.8;
      
      node.position({ x, y });
    });

    return this;
  },

  stop: function() {
    return this;
  }
};

/**
 * Custom Geographic Layout
 */
export const d3GeographicLayout = {
  name: 'd3-geographic',
  
  run: function(cy) {
    const nodes = cy.nodes();
    const containerWidth = cy.width();
    const containerHeight = cy.height();

    // Extract geographic coordinates
    const nodesWithCoords = nodes.map(node => {
      const data = node.data();
      let lat = null, lng = null;

      // Try to extract coordinates from various properties
      if (data.latitude && data.longitude) {
        lat = parseFloat(data.latitude);
        lng = parseFloat(data.longitude);
      } else if (data.coords) {
        const coords = data.coords.split(',');
        lat = parseFloat(coords[0]);
        lng = parseFloat(coords[1]);
      } else if (data.properties) {
        if (data.properties.latitude && data.properties.longitude) {
          lat = parseFloat(data.properties.latitude);
          lng = parseFloat(data.properties.longitude);
        }
      }

      return {
        node,
        lat,
        lng,
        hasCoords: lat !== null && lng !== null
      };
    });

    // Separate nodes with and without coordinates
    const withCoords = nodesWithCoords.filter(n => n.hasCoords);
    const withoutCoords = nodesWithCoords.filter(n => !n.hasCoords);

    if (withCoords.length > 0) {
      // Create projection for nodes with coordinates
      const latExtent = d3.extent(withCoords, d => d.lat);
      const lngExtent = d3.extent(withCoords, d => d.lng);

      const xScale = d3.scaleLinear()
        .domain(lngExtent)
        .range([50, containerWidth - 50]);

      const yScale = d3.scaleLinear()
        .domain(latExtent)
        .range([containerHeight - 50, 50]); // Inverted for map coordinates

      // Position nodes with coordinates
      withCoords.forEach(({ node, lat, lng }) => {
        node.position({
          x: xScale(lng),
          y: yScale(lat)
        });
      });
    }

    // Position nodes without coordinates in a sidebar
    const sidebarWidth = 150;
    const sidebarX = containerWidth - sidebarWidth / 2;
    const sidebarSpacing = Math.min(50, containerHeight / (withoutCoords.length || 1));

    withoutCoords.forEach(({ node }, index) => {
      node.position({
        x: sidebarX,
        y: 50 + index * sidebarSpacing
      });
    });

    return this;
  },

  stop: function() {
    return this;
  }
};

/**
 * Custom Arc Diagram Layout
 */
export const d3ArcLayout = {
  name: 'd3-arc',
  
  run: function(cy) {
    const nodes = cy.nodes();
    const edges = cy.edges();
    
    // Arrange nodes in a line
    const nodeSpacing = cy.width() / (nodes.length || 1);
    
    nodes.forEach((node, index) => {
      node.position({
        x: (index + 0.5) * nodeSpacing,
        y: cy.height() * 0.8
      });
    });

    // Create arcs for edges (visual representation would need custom rendering)
    edges.forEach(edge => {
      const source = edge.source().position();
      const target = edge.target().position();
      const distance = Math.abs(target.x - source.x);
      
      // Store arc information for potential custom rendering
      edge.data('arcHeight', Math.min(200, distance * 0.5));
    });

    return this;
  },

  stop: function() {
    return this;
  }
};

/**
 * Register all custom layouts with Cytoscape
 */
export const registerCustomLayouts = (cytoscape) => {
  cytoscape('layout', 'd3-force', d3ForceLayout);
  cytoscape('layout', 'd3-hierarchical', d3HierarchicalLayout);
  cytoscape('layout', 'd3-circular-cluster', d3CircularClusterLayout);
  cytoscape('layout', 'd3-timeline', d3TimelineLayout);
  cytoscape('layout', 'd3-geographic', d3GeographicLayout);
  cytoscape('layout', 'd3-arc', d3ArcLayout);
};

/**
 * Enhanced export functionality
 */
export class GraphExporter {
  constructor(cy) {
    this.cy = cy;
  }

  exportToSVG() {
    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const bbox = this.cy.extent();
    
    svg.setAttribute('width', bbox.w);
    svg.setAttribute('height', bbox.h);
    svg.setAttribute('viewBox', `${bbox.x1} ${bbox.y1} ${bbox.w} ${bbox.h}`);

    // Add styles
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      .node { stroke: #fff; stroke-width: 2px; }
      .edge { stroke: #999; stroke-width: 2px; fill: none; }
      .node-label { font-family: Arial, sans-serif; font-size: 12px; text-anchor: middle; }
    `;
    defs.appendChild(style);
    svg.appendChild(defs);

    // Draw edges
    this.cy.edges().forEach(edge => {
      const source = edge.source().position();
      const target = edge.target().position();
      
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', source.x);
      line.setAttribute('y1', source.y);
      line.setAttribute('x2', target.x);
      line.setAttribute('y2', target.y);
      line.setAttribute('class', 'edge');
      line.setAttribute('stroke', edge.style('line-color'));
      line.setAttribute('stroke-width', edge.style('width'));
      
      svg.appendChild(line);
    });

    // Draw nodes
    this.cy.nodes().forEach(node => {
      const pos = node.position();
      const width = node.width();
      const height = node.height();
      
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', pos.x - width / 2);
      rect.setAttribute('y', pos.y - height / 2);
      rect.setAttribute('width', width);
      rect.setAttribute('height', height);
      rect.setAttribute('class', 'node');
      rect.setAttribute('fill', node.style('background-color'));
      rect.setAttribute('rx', 5);
      
      svg.appendChild(rect);
      
      // Add label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pos.x);
      text.setAttribute('y', pos.y + 4);
      text.setAttribute('class', 'node-label');
      text.textContent = node.data('label');
      
      svg.appendChild(text);
    });

    return new XMLSerializer().serializeToString(svg);
  }

  exportToGEXF() {
    // Generate GEXF format for Gephi
    const gexf = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
  <meta lastmodifieddate="${new Date().toISOString()}">
    <creator>IntelGraph</creator>
    <description>Intelligence graph export</description>
  </meta>
  <graph mode="static" defaultedgetype="directed">
    <nodes>
      ${this.cy.nodes().map(node => `
        <node id="${node.id()}" label="${node.data('label')}">
          <attvalues>
            <attvalue for="type" value="${node.data('type')}"/>
            <attvalue for="importance" value="${node.data('importance') || 1}"/>
          </attvalues>
        </node>
      `).join('')}
    </nodes>
    <edges>
      ${this.cy.edges().map((edge, index) => `
        <edge id="${index}" source="${edge.source().id()}" target="${edge.target().id()}" label="${edge.data('label')}">
          <attvalues>
            <attvalue for="type" value="${edge.data('type')}"/>
            <attvalue for="weight" value="${edge.data('weight') || 0.5}"/>
          </attvalues>
        </edge>
      `).join('')}
    </edges>
  </graph>
</gexf>`;
    
    return gexf;
  }

  exportToGraphML() {
    // Generate GraphML format
    const graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="type" for="node" attr.name="type" attr.type="string"/>
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="importance" for="node" attr.name="importance" attr.type="double"/>
  <key id="edge_type" for="edge" attr.name="type" attr.type="string"/>
  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>
  
  <graph id="IntelGraph" edgedefault="directed">
    ${this.cy.nodes().map(node => `
      <node id="${node.id()}">
        <data key="label">${node.data('label')}</data>
        <data key="type">${node.data('type')}</data>
        <data key="importance">${node.data('importance') || 1}</data>
      </node>
    `).join('')}
    
    ${this.cy.edges().map((edge, index) => `
      <edge id="e${index}" source="${edge.source().id()}" target="${edge.target().id()}">
        <data key="edge_type">${edge.data('type')}</data>
        <data key="weight">${edge.data('weight') || 0.5}</data>
      </edge>
    `).join('')}
  </graph>
</graphml>`;
    
    return graphml;
  }

  exportToCypher() {
    // Generate Cypher CREATE statements for Neo4j
    const nodeStatements = this.cy.nodes().map(node => {
      const data = node.data();
      const properties = {
        id: data.id,
        label: data.label,
        type: data.type,
        importance: data.importance || 1,
        ...data.properties
      };
      
      const propsString = Object.entries(properties)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ');
      
      return `CREATE (n${data.id}:${data.type} {${propsString}})`;
    });

    const edgeStatements = this.cy.edges().map(edge => {
      const data = edge.data();
      const properties = {
        weight: data.weight || 0.5,
        ...data.properties
      };
      
      const propsString = Object.entries(properties)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ');
      
      return `CREATE (n${data.source})-[:${data.type} {${propsString}}]->(n${data.target})`;
    });

    return [...nodeStatements, ...edgeStatements].join(';\n') + ';';
  }
}

export default {
  registerCustomLayouts,
  GraphExporter,
  d3ForceLayout,
  d3HierarchicalLayout,
  d3CircularClusterLayout,
  d3TimelineLayout,
  d3GeographicLayout,
  d3ArcLayout
};