import { TimeScope, TimeNode } from './types.js';

export class TimeScopeResolver {
  /**
   * Resolves query time scope (Tq) from text.
   * Handles years (2024), months (Oct 2025), and explicit dates (2025-10-27).
   */
  async resolve(query: string): Promise<TimeScope> {
    // 1. Check for ISO date (YYYY-MM-DD)
    const isoMatch = query.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoMatch) {
      const date = new Date(isoMatch[0]);
      return {
        start: new Date(date.setHours(0, 0, 0, 0)),
        end: new Date(date.setHours(23, 59, 59, 999)),
        raw: isoMatch[0]
      };
    }

    // 2. Check for Month Year (e.g., "Oct 2025", "October 2025")
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monthMatch = query.match(new RegExp(`\\b(${monthNames.join('|')})\\w*\\s+(\\d{4})\\b`, 'i'));
    if (monthMatch) {
      const monthIndex = monthNames.indexOf(monthMatch[1].toLowerCase().substring(0, 3));
      const year = parseInt(monthMatch[2]);
      return {
        start: new Date(year, monthIndex, 1),
        end: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
        raw: monthMatch[0]
      };
    }

    // 3. Check for plain Year
    const yearMatch = query.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0]);
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
        raw: yearMatch[0]
      };
    }

    // Default to a broad range if no time mentioned
    return {
      start: new Date(0),
      end: new Date(8640000000000000),
      raw: 'all-time'
    };
  }

  alignToHierarchy(scope: TimeScope, timeNodes: TimeNode[]): TimeNode[] {
    return timeNodes.filter(node => {
      const nodeStart = new Date(node.start);
      const nodeEnd = new Date(node.end);
      return nodeStart >= scope.start && nodeEnd <= scope.end;
    });
  }

  static generateTimeHierarchy(startYear: number, endYear: number): TimeNode[] {
    const nodes: TimeNode[] = [];
    for (let year = startYear; year <= endYear; year++) {
      const yearId = `year-${year}`;
      nodes.push({
        id: yearId,
        granularity: 'year',
        start: `${year}-01-01T00:00:00Z`,
        end: `${year}-12-31T23:59:59Z`,
        childIds: []
      });
    }
    return nodes;
  }

  /**
   * Performs an incremental update to the time hierarchy.
   * Only adds or updates nodes relevant to the new time range.
   */
  async updateIncremental(newNode: TimeNode, existingNodes: Map<string, TimeNode>) {
    existingNodes.set(newNode.id, newNode);
    if (newNode.parentId && existingNodes.has(newNode.parentId)) {
        const parent = existingNodes.get(newNode.parentId)!;
        if (!parent.childIds.includes(newNode.id)) {
            parent.childIds.push(newNode.id);
            // Recursively update ancestors if needed (e.g. for summaries)
        }
    }
  }
}
