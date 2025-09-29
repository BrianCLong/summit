export function exportCyToSvg(cy, options = {}) {
  if (!cy) return '';
  const padding = options.padding || 20;
  const bbox = cy.elements().boundingBox();
  const width = Math.ceil(bbox.w + padding * 2);
  const height = Math.ceil(bbox.h + padding * 2);
  const offsetX = padding - bbox.x1;
  const offsetY = padding - bbox.y1;

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g,'&gt;');
  const nodes = cy.nodes().map(n => {
    const p = n.position();
    const r = Math.max(15, (n.data('importance') || 3) * 5);
    const fill = n.style('background-color');
    const stroke = n.style('border-color') || '#fff';
    const strokeWidth = parseFloat(n.style('border-width')) || 2;
    const label = n.data('label') || '';
    return `\n  <g class="node" id="node-${esc(n.id())}">\n    <circle cx="${(p.x+offsetX).toFixed(2)}" cy="${(p.y+offsetY).toFixed(2)}" r="${r}" fill="${esc(fill)}" stroke="${esc(stroke)}" stroke-width="${strokeWidth}" />\n    <text x="${(p.x+offsetX).toFixed(2)}" y="${(p.y+offsetY+r+14).toFixed(2)}" font-family="Arial" font-size="12" fill="#333" text-anchor="middle">${esc(label)}</text>\n  </g>`;
  }).join('');

  const edges = cy.edges().map(e => {
    const s = e.source().position();
    const t = e.target().position();
    const color = e.style('line-color') || '#999';
    const width = parseFloat(e.style('width')) || 2;
    const label = e.data('label') || '';
    const midX = (s.x + t.x)/2 + offsetX;
    const midY = (s.y + t.y)/2 + offsetY;
    return `\n  <g class="edge" id="edge-${esc(e.id())}">\n    <line x1="${(s.x+offsetX).toFixed(2)}" y1="${(s.y+offsetY).toFixed(2)}" x2="${(t.x+offsetX).toFixed(2)}" y2="${(t.y+offsetY).toFixed(2)}" stroke="${esc(color)}" stroke-width="${width}" />\n    <text x="${midX.toFixed(2)}" y="${(midY-6).toFixed(2)}" font-family="Arial" font-size="10" fill="#666" text-anchor="middle">${esc(label)}</text>\n  </g>`;
  }).join('');

  const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n <rect width="100%" height="100%" fill="#ffffff"/>${edges}${nodes}\n</svg>`;
  return svg;
}

export function downloadSvg(svgString, filename = `graph-${Date.now()}.svg`) {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

