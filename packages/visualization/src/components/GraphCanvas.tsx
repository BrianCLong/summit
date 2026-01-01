import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { select, Selection } from 'd3-selection';
import { zoom, ZoomBehavior, D3ZoomEvent } from 'd3-zoom';
import { drag, DragBehavior } from 'd3-drag';
import { forceSimulation, forceLink, forceManyBody, forceCenter, Simulation, SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';
import { createMargin, calculateInnerDimensions } from '../utils';
import { useVisualizationDimensions, useSelection, useZoomPan, useTooltip } from '../hooks';
import { VisualizationContainer } from './VisualizationContainer';
import { Tooltip } from './Tooltip';
import { DataPoint, Margin, Dimension, InteractionConfig } from '../types';
import { useInteraction } from '../contexts';

// Define types for graph-specific data
export interface GraphNode extends SimulationNodeDatum {
  id: string;
  type?: string;
  label?: string;
  size?: number;
  color?: string;
  data?: any;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string;
  strength?: number;
  data?: any;
}

export interface GraphCanvasProps {
  nodes: GraphNode[];
  links: GraphLink[];
  width?: number;
  height?: number;
  className?: string;
  margin?: Margin;
  nodeSize?: number | ((node: GraphNode) => number);
  nodeColor?: string | ((node: GraphNode) => string);
  linkColor?: string | ((link: GraphLink) => string);
  linkWidth?: number | ((link: GraphLink) => number);
  linkOpacity?: number | ((link: GraphLink) => number);
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  onLinkClick?: (link: GraphLink) => void;
  onLinkHover?: (link: GraphLink | null) => void;
  interaction?: InteractionConfig;
  layout?: 'force' | 'hierarchical' | 'circular' | 'grid';
  layoutConfig?: any;
  showLabels?: boolean;
  labelThreshold?: number; // Minimum zoom level to show labels
  enableFiltering?: boolean;
  filterFn?: (node: GraphNode) => boolean;
  enableHighlighting?: boolean;
  highlightConnected?: boolean;
  enableTooltips?: boolean;
  tooltipContent?: (node: GraphNode) => string;
  enableZoom?: boolean;
  enablePan?: boolean;
  enableDrag?: boolean;
  enableSelection?: boolean;
  enableAnimation?: boolean;
  animationDuration?: number;
  onGraphReady?: () => void;
}

const DEFAULT_MARGIN: Margin = createMargin(20, 20, 40, 40);

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  links,
  className = '',
  margin = DEFAULT_MARGIN,
  nodeSize = 10,
  nodeColor = '#1f77b4',
  linkColor = '#999',
  linkWidth = 1,
  onNodeClick,
  onNodeHover,
  onLinkClick,
  onLinkHover,
  interaction = { enabled: true, zoom: true, pan: true, hover: true, click: true, drag: true, select: true },
  layout = 'force',
  layoutConfig = {},
  showLabels = true,
  labelThreshold = 1.5,
  enableFiltering = false,
  filterFn,
  enableHighlighting = true,
  highlightConnected = true,
  enableTooltips = true,
  tooltipContent,
  enableZoom = true,
  enablePan = true,
  enableDrag = true,
  enableSelection = true,
  enableAnimation = true,
  animationDuration = 750,
  onGraphReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const dragBehaviorRef = useRef<DragBehavior<SVGSVGElement, unknown, unknown> | null>(null);
  const [dimensions, setDimensions] = useState<Dimension>({ width: 0, height: 0 });
  
  // Use existing hooks
  const { zoom, pan, setZoom, setPan, reset } = useZoomPan(1, [0, 0]);
  const { selection, select, deselect, toggle, clear, isSelected } = useSelection<GraphNode>();
  const { tooltip, showTooltip, hideTooltip } = useTooltip<GraphNode>();
  const { hoveredId, setHoveredId, selectedIds, selectIds, deselectIds, toggleId } = useInteraction();
  
  // Filter nodes if filtering is enabled
  const filteredNodes = useMemo(() => {
    if (!enableFiltering || !filterFn) return nodes;
    return nodes.filter(filterFn);
  }, [nodes, enableFiltering, filterFn]);

  // Create node map for quick lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    filteredNodes.forEach(node => {
      map.set(node.id, node);
    });
    return map;
  }, [filteredNodes]);

  // Apply dimensions using the existing hook
  const vizDimensions = useVisualizationDimensions(containerRef);
  
  useEffect(() => {
    if (vizDimensions.width && vizDimensions.height) {
      const innerDims = calculateInnerDimensions(vizDimensions, margin);
      setDimensions(innerDims);
    }
  }, [vizDimensions, margin]);

  // Initialize simulation
  useEffect(() => {
    if (!dimensions.width || !dimensions.height || !svgRef.current) return;

    // Clean up previous simulation if exists
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Create simulation based on layout type
    let simulation: Simulation<GraphNode, GraphLink>;
    
    switch (layout) {
      case 'force':
        simulation = forceSimulation<GraphNode, GraphLink>(filteredNodes)
          .force('link', forceLink<GraphNode, GraphLink>(links)
            .id(d => d.id)
            .distance(d => d.strength ? 100 / d.strength : 100)
          )
          .force('charge', forceManyBody<GraphNode>().strength(-300))
          .force('center', forceCenter(dimensions.width / 2, dimensions.height / 2));
        break;
      case 'hierarchical':
        // For hierarchical layout, we'd need to use dagre or similar
        simulation = forceSimulation<GraphNode, GraphLink>(filteredNodes)
          .force('link', forceLink<GraphNode, GraphLink>(links)
            .id(d => d.id)
            .distance(150)
          )
          .force('charge', forceManyBody<GraphNode>().strength(-200))
          .force('center', forceCenter(dimensions.width / 2, dimensions.height / 2));
        break;
      case 'circular':
        simulation = forceSimulation<GraphNode, GraphLink>(filteredNodes)
          .force('center', forceCenter(dimensions.width / 2, dimensions.height / 2))
          .force('collision', forceCenter(30));
        break;
      case 'grid':
        simulation = forceSimulation<GraphNode, GraphLink>(filteredNodes)
          .force('center', forceCenter(dimensions.width / 2, dimensions.height / 2));
        break;
      default:
        simulation = forceSimulation<GraphNode, GraphLink>(filteredNodes)
          .force('link', forceLink<GraphNode, GraphLink>(links).id(d => d.id))
          .force('charge', forceManyBody<GraphNode>())
          .force('center', forceCenter(dimensions.width / 2, dimensions.height / 2));
    }

    // Update positions on tick
    simulation.on('tick', () => {
      updateNodePositions();
    });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [filteredNodes, links, dimensions, layout, layoutConfig]);

  // Update node positions in the DOM
  const updateNodePositions = useCallback(() => {
    if (!svgRef.current) return;
    
    const svg = select(svgRef.current);
    const nodeGroup = svg.select('.nodes');
    const linkGroup = svg.select('.links');
    
    // Update links
    linkGroup.selectAll<SVGLineElement, GraphLink>('line')
      .attr('x1', d => {
        const source = typeof d.source === 'string' ? nodeMap.get(d.source) : d.source;
        return source?.x || 0;
      })
      .attr('y1', d => {
        const source = typeof d.source === 'string' ? nodeMap.get(d.source) : d.source;
        return source?.y || 0;
      })
      .attr('x2', d => {
        const target = typeof d.target === 'string' ? nodeMap.get(d.target) : d.target;
        return target?.x || 0;
      })
      .attr('y2', d => {
        const target = typeof d.target === 'string' ? nodeMap.get(d.target) : d.target;
        return target?.y || 0;
      });

    // Update nodes
    nodeGroup.selectAll<SVGCircleElement, GraphNode>('circle')
      .attr('cx', d => d.x || 0)
      .attr('cy', d => d.y || 0);

    // Update labels if visible
    if (showLabels) {
      nodeGroup.selectAll<SVGTextElement, GraphNode>('text')
        .attr('x', d => d.x || 0)
        .attr('y', d => (d.y || 0) + (typeof nodeSize === 'function' ? nodeSize(d) : nodeSize) + 10);
    }
  }, [nodeMap, nodeSize, showLabels]);

  // Initialize SVG and elements
  useEffect(() => {
    if (!svgRef.current || !dimensions.width || !dimensions.height) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    // Create groups
    const container = svg.append('g');
    const linkGroup = container.append('g').attr('class', 'links');
    const nodeGroup = container.append('g').attr('class', 'nodes');

    // Add zoom behavior
    if (enableZoom || enablePan) {
      const zoomBehavior = zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 8])
        .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
          container.attr('transform', event.transform);
          setZoom(event.transform.k);
          
          // Update label visibility based on zoom level
          if (showLabels) {
            nodeGroup.selectAll<SVGTextElement, GraphNode>('text')
              .style('opacity', event.transform.k >= labelThreshold ? 1 : 0);
          }
        });

      svg.call(zoomBehavior);
      zoomBehaviorRef.current = zoomBehavior;
    }

    // Draw links
    const link = linkGroup
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', typeof linkColor === 'function' ? linkColor : () => linkColor)
      .attr('stroke-width', typeof linkWidth === 'function' ? linkWidth : () => linkWidth)
      .attr('stroke-opacity', typeof linkOpacity === 'function' ? linkOpacity : () => linkOpacity ?? 0.6);

    // Add link interaction if enabled
    if (interaction.enabled && interaction.click) {
      link.on('click', (event, d) => {
        event.stopPropagation();
        onLinkClick?.(d);
      });
    }

    if (interaction.enabled && interaction.hover) {
      link.on('mouseenter', (event, d) => {
        if (highlightConnected) {
          // Highlight connected nodes
          const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
          const targetId = typeof d.target === 'string' ? d.target : d.target.id;
          nodeGroup.selectAll<SVGCircleElement, GraphNode>('circle')
            .filter(n => n.id === sourceId || n.id === targetId)
            .attr('stroke', '#fbbf24')
            .attr('stroke-width', 2);

          // Highlight the link itself
          select(event.currentTarget)
            .attr('stroke', '#fbbf24')
            .attr('stroke-width', 3)
            .attr('stroke-opacity', 1);
        }
        onLinkHover?.(d);
      });

      link.on('mouseleave', (event, d) => {
        if (highlightConnected) {
          // Reset connected nodes
          const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
          const targetId = typeof d.target === 'string' ? d.target : d.target.id;
          nodeGroup.selectAll<SVGCircleElement, GraphNode>('circle')
            .filter(n => n.id === sourceId || n.id === targetId)
            .attr('stroke', null)
            .attr('stroke-width', null);

          // Reset the link itself
          select(event.currentTarget)
            .attr('stroke', typeof linkColor === 'function' ? linkColor(d) : linkColor)
            .attr('stroke-width', typeof linkWidth === 'function' ? linkWidth(d) : linkWidth)
            .attr('stroke-opacity', typeof linkOpacity === 'function' ? linkOpacity(d) : linkOpacity ?? 0.6);
        }
        onLinkHover?.(null);
      });
    }

    // Draw nodes
    const node = nodeGroup
      .selectAll<SVGGElement, GraphNode>('g')
      .data(filteredNodes)
      .enter()
      .append('g')
      .attr('class', 'node');

    // Node circles
    const circles = node
      .append('circle')
      .attr('r', typeof nodeSize === 'function' ? nodeSize : () => nodeSize)
      .attr('fill', typeof nodeColor === 'function' ? nodeColor : () => nodeColor)
      .attr('stroke', d => isSelected(d) ? '#fbbf24' : null)
      .attr('stroke-width', d => isSelected(d) ? 2 : null);

    // Add drag behavior if enabled
    if (enableDrag && simulationRef.current) {
      const dragBehavior = drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulationRef.current?.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });

      node.call(dragBehavior);
      dragBehaviorRef.current = dragBehavior;
    }

    // Add node interaction
    if (interaction.enabled) {
      if (interaction.click) {
        node.on('click', (event, d) => {
          event.stopPropagation();
          if (enableSelection) {
            toggle(d);
            toggleId(d.id);
          }
          onNodeClick?.(d);
        });
      }

      if (interaction.hover) {
        node.on('mouseenter', (event, d) => {
          if (enableHighlighting && highlightConnected) {
            // Highlight connected links
            linkGroup.selectAll<SVGLineElement, GraphLink>('line')
              .filter(l =>
                (typeof l.source === 'string' ? l.source : l.source.id) === d.id ||
                (typeof l.target === 'string' ? l.target : l.target.id) === d.id
              )
              .attr('stroke', '#fbbf24')
              .attr('stroke-width', 2)
              .attr('stroke-opacity', 1);
          }

          setHoveredId(d.id);
          onNodeHover?.(d);

          if (enableTooltips) {
            const mousePos = d3.pointer(event, svg.node()!);
            showTooltip(mousePos[0], mousePos[1], d);
          }
        });

        node.on('mouseleave', (event, d) => {
          if (enableHighlighting && highlightConnected) {
            // Reset connected links - only reset if not selected
            linkGroup.selectAll<SVGLineElement, GraphLink>('line')
              .filter(l =>
                (typeof l.source === 'string' ? l.source : l.source.id) === d.id ||
                (typeof l.target === 'string' ? l.target : l.target.id) === d.id
              )
              .attr('stroke', l => typeof linkColor === 'function' ? linkColor(l) : linkColor)
              .attr('stroke-width', l => typeof linkWidth === 'function' ? linkWidth(l) : linkWidth)
              .attr('stroke-opacity', l => typeof linkOpacity === 'function' ? linkOpacity(l) : linkOpacity ?? 0.6);
          }

          setHoveredId(null);
          onNodeHover?.(null);

          if (enableTooltips) {
            hideTooltip();
          }
        });
      }
    }

    // Update node appearance based on selection state
    const updateNodeAppearance = () => {
      node.select('circle')
        .attr('stroke', d => isSelected(d) ? '#fbbf24' : null)
        .attr('stroke-width', d => isSelected(d) ? 2 : null);
    };

    // Initial update
    updateNodeAppearance();

    // Add labels if enabled
    if (showLabels) {
      node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .attr('font-size', '10px')
        .attr('fill', '#333')
        .attr('pointer-events', 'none')
        .text(d => d.label || d.id)
        .style('opacity', 0); // Start hidden, show based on zoom level
    }

    // Call the ready callback after initial render
    if (onGraphReady) {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        onGraphReady();
      }, 0);
    }

  }, [
    filteredNodes,
    links,
    dimensions,
    nodeSize,
    nodeColor,
    linkColor,
    linkWidth,
    linkOpacity,
    interaction,
    enableDrag,
    enableSelection,
    enableHighlighting,
    highlightConnected,
    showLabels,
    enableTooltips,
    labelThreshold,
    isSelected,
    onNodeClick,
    onNodeHover,
    onLinkClick,
    onLinkHover,
    toggle,
    toggleId,
    setHoveredId,
    showTooltip,
    hideTooltip,
    onGraphReady
  ]);

  // Update node appearance when selection changes
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);
    const nodeGroup = svg.select('.nodes');

    nodeGroup.selectAll<SVGCircleElement, GraphNode>('circle')
      .attr('stroke', d => isSelected(d) ? '#fbbf24' : null)
      .attr('stroke-width', d => isSelected(d) ? 2 : null);
  }, [selectedIds, isSelected]);

  // Update zoom level based on external changes
  useEffect(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      const svg = select(svgRef.current);
      svg.transition()
        .duration(750)
        .call(zoomBehaviorRef.current.scaleTo, zoom);
    }
  }, [zoom]);

  return (
    <div ref={containerRef} className={`graph-canvas-container ${className}`}>
      <VisualizationContainer>
        {({ width, height }) => (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <svg
              ref={svgRef}
              width={width}
              height={height}
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%)',
                cursor: enablePan ? 'grab' : 'default'
              }}
            />

            {enableTooltips && tooltip.visible && tooltip.data && (
              <Tooltip
                x={tooltip.x}
                y={tooltip.y}
                content={tooltipContent ? tooltipContent(tooltip.data) : `Node: ${tooltip.data.label || tooltip.data.id}`}
              />
            )}

            {/* Graph controls */}
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              display: 'flex',
              gap: '5px',
              zIndex: 10
            }}>
              <button
                onClick={() => {
                  if (zoomBehaviorRef.current && svgRef.current) {
                    select(svgRef.current).call(zoomBehaviorRef.current.scaleTo, 1);
                  }
                }}
                style={{
                  padding: '5px 10px',
                  background: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Reset zoom"
              >
                Reset
              </button>
              <button
                onClick={clear}
                style={{
                  padding: '5px 10px',
                  background: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Clear selection"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </VisualizationContainer>
    </div>
  );
};

export default GraphCanvas;