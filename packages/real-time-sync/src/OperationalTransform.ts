import { Operation, OperationType } from './types';

/**
 * Operational Transformation engine for concurrent editing
 * Implements OT algorithms to handle concurrent operations on shared documents
 */
export class OperationalTransform {
  /**
   * Transform two concurrent operations against each other
   * Returns transformed versions that can be applied in any order
   */
  transform(op1: Operation, op2: Operation): [Operation, Operation] {
    // If operations are on different versions, they need transformation
    if (op1.type === OperationType.INSERT && op2.type === OperationType.INSERT) {
      return this.transformInsertInsert(op1, op2);
    }

    if (op1.type === OperationType.INSERT && op2.type === OperationType.DELETE) {
      return this.transformInsertDelete(op1, op2);
    }

    if (op1.type === OperationType.DELETE && op2.type === OperationType.INSERT) {
      const [op2Prime, op1Prime] = this.transformInsertDelete(op2, op1);
      return [op1Prime, op2Prime];
    }

    if (op1.type === OperationType.DELETE && op2.type === OperationType.DELETE) {
      return this.transformDeleteDelete(op1, op2);
    }

    if (op1.type === OperationType.UPDATE || op2.type === OperationType.UPDATE) {
      return this.transformUpdate(op1, op2);
    }

    // No transformation needed
    return [op1, op2];
  }

  private transformInsertInsert(op1: Operation, op2: Operation): [Operation, Operation] {
    const pos1 = op1.position;
    const pos2 = op2.position;

    if (pos1 < pos2) {
      // op1 is before op2, adjust op2's position
      return [
        op1,
        { ...op2, position: pos2 + this.getContentLength(op1) }
      ];
    } else if (pos1 > pos2) {
      // op2 is before op1, adjust op1's position
      return [
        { ...op1, position: pos1 + this.getContentLength(op2) },
        op2
      ];
    } else {
      // Same position - use timestamp as tiebreaker
      if (op1.timestamp < op2.timestamp) {
        return [
          op1,
          { ...op2, position: pos2 + this.getContentLength(op1) }
        ];
      } else {
        return [
          { ...op1, position: pos1 + this.getContentLength(op2) },
          op2
        ];
      }
    }
  }

  private transformInsertDelete(insert: Operation, del: Operation): [Operation, Operation] {
    const insPos = insert.position;
    const delPos = del.position;
    const delLen = del.length || 0;

    if (insPos <= delPos) {
      // Insert is before delete, adjust delete position
      return [
        insert,
        { ...del, position: delPos + this.getContentLength(insert) }
      ];
    } else if (insPos >= delPos + delLen) {
      // Insert is after delete, adjust insert position
      return [
        { ...insert, position: insPos - delLen },
        del
      ];
    } else {
      // Insert is within delete range
      // Adjust both operations
      return [
        { ...insert, position: delPos },
        { ...del, length: delLen + this.getContentLength(insert) }
      ];
    }
  }

  private transformDeleteDelete(op1: Operation, op2: Operation): [Operation, Operation] {
    const pos1 = op1.position;
    const len1 = op1.length || 0;
    const pos2 = op2.position;
    const len2 = op2.length || 0;

    // No overlap
    if (pos1 + len1 <= pos2) {
      return [
        op1,
        { ...op2, position: pos2 - len1 }
      ];
    } else if (pos2 + len2 <= pos1) {
      return [
        { ...op1, position: pos1 - len2 },
        op2
      ];
    }

    // Overlapping deletes - need to merge
    const start = Math.min(pos1, pos2);
    const end = Math.max(pos1 + len1, pos2 + len2);
    const overlapStart = Math.max(pos1, pos2);
    const overlapEnd = Math.min(pos1 + len1, pos2 + len2);
    const overlap = Math.max(0, overlapEnd - overlapStart);

    return [
      { ...op1, position: start, length: len1 - overlap },
      { ...op2, position: start, length: len2 - overlap }
    ];
  }

  private transformUpdate(op1: Operation, op2: Operation): [Operation, Operation] {
    // For update operations, last write wins by default
    // But we preserve both operations with adjusted metadata
    if (op1.position === op2.position) {
      // Same position - use timestamp as tiebreaker
      if (op1.timestamp > op2.timestamp) {
        return [op1, { ...op2, attributes: { ...op2.attributes, overridden: true } }];
      } else {
        return [{ ...op1, attributes: { ...op1.attributes, overridden: true } }, op2];
      }
    }

    return [op1, op2];
  }

  /**
   * Compose two sequential operations into a single operation
   */
  compose(op1: Operation, op2: Operation): Operation {
    if (op1.type === OperationType.INSERT && op2.type === OperationType.DELETE) {
      if (op1.position === op2.position) {
        // Insert followed by delete at same position cancels out
        return {
          ...op1,
          type: OperationType.RETAIN,
          content: undefined
        };
      }
    }

    if (op1.type === OperationType.DELETE && op2.type === OperationType.INSERT) {
      if (op1.position === op2.position) {
        // Delete followed by insert at same position is an update
        return {
          ...op1,
          type: OperationType.UPDATE,
          content: op2.content,
          length: op1.length
        };
      }
    }

    // Can't compose - return second operation
    return op2;
  }

  /**
   * Apply an operation to document content
   */
  apply(content: string, operation: Operation): string {
    switch (operation.type) {
      case OperationType.INSERT:
        return this.applyInsert(content, operation);
      case OperationType.DELETE:
        return this.applyDelete(content, operation);
      case OperationType.UPDATE:
        return this.applyUpdate(content, operation);
      case OperationType.RETAIN:
        return content;
      default:
        return content;
    }
  }

  private applyInsert(content: string, op: Operation): string {
    const insertContent = typeof op.content === 'string' ? op.content : JSON.stringify(op.content);
    return content.slice(0, op.position) + insertContent + content.slice(op.position);
  }

  private applyDelete(content: string, op: Operation): string {
    const length = op.length || 0;
    return content.slice(0, op.position) + content.slice(op.position + length);
  }

  private applyUpdate(content: string, op: Operation): string {
    const length = op.length || 0;
    const updateContent = typeof op.content === 'string' ? op.content : JSON.stringify(op.content);
    return content.slice(0, op.position) + updateContent + content.slice(op.position + length);
  }

  private getContentLength(op: Operation): number {
    if (typeof op.content === 'string') {
      return op.content.length;
    }
    return 1; // For non-string content, treat as single unit
  }

  /**
   * Check if two operations conflict
   */
  hasConflict(op1: Operation, op2: Operation): boolean {
    // Operations conflict if they affect overlapping ranges
    const range1 = this.getOperationRange(op1);
    const range2 = this.getOperationRange(op2);

    return !(range1.end <= range2.start || range2.end <= range1.start);
  }

  private getOperationRange(op: Operation): { start: number; end: number } {
    const start = op.position;
    const length = op.type === OperationType.DELETE ? (op.length || 0) : this.getContentLength(op);
    return { start, end: start + length };
  }
}
