import * as d3 from 'd3';

export interface TooltipPosition {
  x: number;
  y: number;
}

/**
 * Create a tooltip element
 */
export function createTooltip(container: HTMLElement): d3.Selection<HTMLDivElement, unknown, null, undefined> {
  return d3.select(container)
    .append('div')
    .attr('class', 'chart-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background-color', 'rgba(0, 0, 0, 0.8)')
    .style('color', '#fff')
    .style('padding', '8px 12px')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('z-index', '1000')
    .style('box-shadow', '0 2px 4px rgba(0,0,0,0.2)');
}

/**
 * Show tooltip at specified position
 */
export function showTooltip(
  tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>,
  content: string,
  position: TooltipPosition,
  containerWidth: number,
  containerHeight: number
): void {
  tooltip
    .style('visibility', 'visible')
    .html(content);

  // Get tooltip dimensions
  const tooltipNode = tooltip.node();
  if (!tooltipNode) return;

  const tooltipWidth = tooltipNode.offsetWidth;
  const tooltipHeight = tooltipNode.offsetHeight;

  // Adjust position to prevent tooltip from going off-screen
  let { x, y } = position;

  // Horizontal adjustment
  if (x + tooltipWidth > containerWidth) {
    x = containerWidth - tooltipWidth - 10;
  }
  if (x < 0) {
    x = 10;
  }

  // Vertical adjustment
  if (y + tooltipHeight > containerHeight) {
    y = y - tooltipHeight - 10;
  } else {
    y = y + 10;
  }

  tooltip
    .style('left', `${x}px`)
    .style('top', `${y}px`);
}

/**
 * Hide tooltip
 */
export function hideTooltip(tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>): void {
  tooltip.style('visibility', 'hidden');
}

/**
 * Format tooltip content for data point
 */
export function formatTooltipContent(data: any, formatters?: {
  x?: (value: any) => string;
  y?: (value: any) => string;
}): string {
  const parts: string[] = [];

  if (data.label) {
    parts.push(`<strong>${data.label}</strong>`);
  }

  if (data.x !== undefined) {
    const xValue = formatters?.x ? formatters.x(data.x) : data.x;
    parts.push(`X: ${xValue}`);
  }

  if (data.y !== undefined) {
    const yValue = formatters?.y ? formatters.y(data.y) : data.y;
    parts.push(`Y: ${yValue}`);
  }

  if (data.value !== undefined) {
    parts.push(`Value: ${data.value}`);
  }

  if (data.metadata) {
    Object.entries(data.metadata).forEach(([key, value]) => {
      parts.push(`${key}: ${value}`);
    });
  }

  return parts.join('<br/>');
}

/**
 * Create tooltip for multi-series data
 */
export function formatMultiSeriesTooltip(data: any, seriesNames?: string[]): string {
  const parts: string[] = [];

  if (data.x !== undefined) {
    parts.push(`<strong>${data.x}</strong>`);
  }

  if (data.series) {
    Object.entries(data.series).forEach(([key, value]) => {
      const name = seriesNames?.find(n => n === key) || key;
      parts.push(`${name}: ${value}`);
    });
  }

  return parts.join('<br/>');
}

/**
 * Add crosshair to chart
 */
export function addCrosshair(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  width: number,
  height: number
): {
  vertical: d3.Selection<SVGLineElement, unknown, null, undefined>;
  horizontal: d3.Selection<SVGLineElement, unknown, null, undefined>;
} {
  const vertical = svg.append('line')
    .attr('class', 'crosshair-vertical')
    .style('stroke', '#999')
    .style('stroke-width', '1px')
    .style('stroke-dasharray', '3,3')
    .style('opacity', '0')
    .style('pointer-events', 'none');

  const horizontal = svg.append('line')
    .attr('class', 'crosshair-horizontal')
    .style('stroke', '#999')
    .style('stroke-width', '1px')
    .style('stroke-dasharray', '3,3')
    .style('opacity', '0')
    .style('pointer-events', 'none');

  return { vertical, horizontal };
}

/**
 * Update crosshair position
 */
export function updateCrosshair(
  crosshair: {
    vertical: d3.Selection<SVGLineElement, unknown, null, undefined>;
    horizontal: d3.Selection<SVGLineElement, unknown, null, undefined>;
  },
  position: { x: number; y: number },
  height: number,
  width: number,
  show: boolean
): void {
  if (show) {
    crosshair.vertical
      .attr('x1', position.x)
      .attr('x2', position.x)
      .attr('y1', 0)
      .attr('y2', height)
      .style('opacity', '1');

    crosshair.horizontal
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', position.y)
      .attr('y2', position.y)
      .style('opacity', '1');
  } else {
    crosshair.vertical.style('opacity', '0');
    crosshair.horizontal.style('opacity', '0');
  }
}
