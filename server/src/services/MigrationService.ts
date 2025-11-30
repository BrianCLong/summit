import Papa from 'papaparse';

export interface CsvMapping {
  entityType: string;
  keyPrefix: string;
  keyCol: string;
  propMap: { from: string; to: string }[];
  edgeType?: string;
  edgeFrom?: { prefix: string; col: string };
  edgeTo?: { prefix: string; col: string };
  version?: string;
}

export interface GraphEntity {
  type: string;
  key: string;
  props: Record<string, any>;
}

export interface GraphEdge {
  type: string;
  from: string;
  to: string;
  props: Record<string, any>;
}

export interface LineageEntry {
  row: number;
  source: string;
  mappingVersion?: string;
}

export interface MigrationResult {
  entities: GraphEntity[];
  edges: GraphEdge[];
  lineage: LineageEntry[];
}

export async function mapCsvToGraph(
  csvText: string,
  mapping: CsvMapping
): Promise<MigrationResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      complete: (results) => {
        const rows = results.data as Record<string, any>[];
        const out: MigrationResult = {
          entities: [],
          edges: [],
          lineage: [],
        };

        rows.forEach((r, i) => {
          // Skip empty rows
          if (Object.keys(r).length === 0) return;
          // Skip rows missing key column
          if (!r[mapping.keyCol]) return;

          const e: GraphEntity = {
            type: mapping.entityType,
            key: `${mapping.keyPrefix}:${r[mapping.keyCol]}`,
            props: {},
          };

          mapping.propMap.forEach((m) => {
            if (r[m.from]) e.props[m.to] = r[m.from];
          });
          out.entities.push(e);

          if (
            mapping.edgeFrom &&
            mapping.edgeTo &&
            mapping.edgeType &&
            r[mapping.edgeFrom.col] &&
            r[mapping.edgeTo.col]
          ) {
            out.edges.push({
              type: mapping.edgeType,
              from: `${mapping.edgeFrom.prefix}:${r[mapping.edgeFrom.col]}`,
              to: `${mapping.edgeTo.prefix}:${r[mapping.edgeTo.col]}`,
              props: { source: 'csv-import' },
            });
          }

          out.lineage.push({
            row: i,
            source: 'csv',
            mappingVersion: mapping.version,
          });
        });

        resolve(out);
      },
      error: (error: any) => {
        reject(error);
      },
    });
  });
}

// Plan over-cap UX (server guard)
export function enforceCap(
  ctx: any,
  metric: string,
  value: number
): { warning: boolean; message?: string } {
  const cap = ctx.plan?.caps?.[metric];
  if (cap) {
    if (cap.hard && value > cap.hard) {
      throw new Error(
        `Plan cap reached for ${metric}. Contact support to increase.`
      );
    }
    if (cap.soft && value > cap.soft) {
      return {
        warning: true,
        message: `Approaching ${metric} cap (${value}/${cap.hard}).`,
      };
    }
  }
  return { warning: false };
}
