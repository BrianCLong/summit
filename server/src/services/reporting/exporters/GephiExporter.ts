/**
 * Gephi Report Exporter
 * Exports network data to GEXF format for Gephi visualization
 */

import { promises as fs } from 'fs';
import path from 'path';
import { BaseReportExporter } from './IReportExporter.js';
import type { Report, ExportResult } from '../types/index.js';
import type { ReportTemplate } from '../types/Template.js';

export class GephiExporter extends BaseReportExporter {
  readonly format = 'GEPHI';
  readonly mimeType = 'application/gexf+xml';
  readonly extension = 'gexf';
  readonly supports = ['graph_data', 'network_visualization'];

  canExport(report: Report): boolean {
    // Check if report has network data
    return !!(report.data?.nodes?.length > 0 || report.data?.edges?.length > 0);
  }

  async export(report: Report, template: ReportTemplate): Promise<ExportResult> {
    const gexfContent = this.generateGEXFContent(report);

    const filename = `network_${report.id}_${new Date().toISOString().split('T')[0]}.gexf`;
    const filepath = path.join('/tmp', filename);

    await fs.writeFile(filepath, gexfContent, 'utf-8');

    return {
      format: 'gexf',
      path: filepath,
      size: Buffer.byteLength(gexfContent, 'utf-8'),
      mimeType: this.mimeType,
      filename,
      gexf: gexfContent,
    };
  }

  private generateGEXFContent(report: Report): string {
    const nodes = this.extractNodes(report);
    const edges = this.extractEdges(report);

    const nodesXml = nodes.map((node) =>
      `      <node id="${this.escapeXml(node.id)}" label="${this.escapeXml(node.label || node.id)}">
        <attvalues>
          ${node.type ? `<attvalue for="type" value="${this.escapeXml(node.type)}"/>` : ''}
          ${node.weight !== undefined ? `<attvalue for="weight" value="${node.weight}"/>` : ''}
        </attvalues>
      </node>`
    ).join('\n');

    const edgesXml = edges.map((edge, i) =>
      `      <edge id="${i}" source="${this.escapeXml(edge.source)}" target="${this.escapeXml(edge.target)}"${edge.weight ? ` weight="${edge.weight}"` : ''}${edge.type ? ` label="${this.escapeXml(edge.type)}"` : ''}/>`
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2"
      xmlns:viz="http://www.gexf.net/1.2draft/viz"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.gexf.net/1.2draft http://www.gexf.net/1.2draft/gexf.xsd">
  <meta lastmodifieddate="${new Date().toISOString().split('T')[0]}">
    <creator>IntelGraph Platform</creator>
    <description>Report: ${this.escapeXml(report.id)}</description>
  </meta>
  <graph mode="static" defaultedgetype="undirected">
    <attributes class="node">
      <attribute id="type" title="Type" type="string"/>
      <attribute id="weight" title="Weight" type="float"/>
    </attributes>
    <nodes>
${nodesXml}
    </nodes>
    <edges>
${edgesXml}
    </edges>
  </graph>
</gexf>`;
  }

  private extractNodes(report: Report): any[] {
    // Try multiple sources for node data
    if (report.data?.nodes?.length > 0) {
      return report.data.nodes;
    }
    if (report.data?.entities?.length > 0) {
      return report.data.entities.map((e: any) => ({
        id: e.id,
        label: e.label || e.name,
        type: e.type,
        weight: e.connectionCount || e.weight,
      }));
    }
    // Try sections
    for (const section of report.sections) {
      if (section.data?.nodes?.length > 0) return section.data.nodes;
      if (section.data?.entities?.length > 0) {
        return section.data.entities.map((e: any) => ({
          id: e.id,
          label: e.label || e.name,
          type: e.type,
        }));
      }
    }
    return [];
  }

  private extractEdges(report: Report): any[] {
    if (report.data?.edges?.length > 0) {
      return report.data.edges;
    }
    if (report.data?.relationships?.length > 0) {
      return report.data.relationships.map((r: any) => ({
        source: r.source,
        target: r.target,
        type: r.type,
        weight: r.weight,
      }));
    }
    // Try sections
    for (const section of report.sections) {
      if (section.data?.edges?.length > 0) return section.data.edges;
      if (section.data?.relationships?.length > 0) {
        return section.data.relationships.map((r: any) => ({
          source: r.source,
          target: r.target,
          type: r.type,
          weight: r.weight,
        }));
      }
    }
    return [];
  }

  private escapeXml(str: string): string {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
