
export type OpType = 'insert' | 'delete' | 'retain' | 'update_prop' | 'move_node';

export interface Operation {
  type: OpType;
  position?: number; // For text
  text?: string;     // For text insert
  count?: number;    // For text delete/retain
  entityId?: string; // For graph
  key?: string;      // For property update
  value?: any;       // For property update/move
}

export class OperationalTransform {
  /**
   * Transform op1 against op2.
   * Assumes op1 and op2 originated from the same state.
   * Returns pair [op1', op2'] such that applying op1 then op2' is equivalent to applying op2 then op1'.
   */
  static transform(op1: Operation, op2: Operation): [Operation, Operation] {
    if (op1.type === 'insert' && op2.type === 'insert') {
      return this.transformInsertInsert(op1, op2);
    }
    if (op1.type === 'insert' && op2.type === 'delete') {
      return this.transformInsertDelete(op1, op2);
    }
    if (op1.type === 'delete' && op2.type === 'insert') {
      return this.transformDeleteInsert(op1, op2);
    }
    if (op1.type === 'delete' && op2.type === 'delete') {
      return this.transformDeleteDelete(op1, op2);
    }

    // For graph properties (LWW or specialized)
    if (op1.entityId && op2.entityId) {
       if (op1.entityId !== op2.entityId) {
         // Independent entities, no transformation needed
         return [op1, op2];
       }
       if (op1.type === 'move_node' && op2.type === 'move_node') {
         // Last writer wins (or server decides)
         // Here we just return them as is, creating a "conflict" that applies sequentially
         return [op1, op2];
       }
       // ... other graph transformations
    }

    // Default: identity
    return [op1, op2];
  }

  private static transformInsertInsert(op1: Operation, op2: Operation): [Operation, Operation] {
    const p1 = op1.position || 0;
    const p2 = op2.position || 0;

    if (p1 < p2) {
      return [op1, { ...op2, position: p2 + (op1.text?.length || 0) }];
    } else if (p1 > p2) {
      return [{ ...op1, position: p1 + (op2.text?.length || 0) }, op2];
    } else {
      // Same position: arbitrary consistency rule (e.g. based on user ID or content)
      // We'll push op2 after op1
      return [op1, { ...op2, position: p2 + (op1.text?.length || 0) }];
    }
  }

  private static transformInsertDelete(op1: Operation, op2: Operation): [Operation, Operation] {
     const p1 = op1.position || 0;
     const p2 = op2.position || 0;
     const len2 = op2.count || 0;

     if (p1 <= p2) {
       return [op1, { ...op2, position: p2 + (op1.text?.length || 0) }];
     } else if (p1 >= p2 + len2) {
       return [{ ...op1, position: p1 - len2 }, op2];
     } else {
       // Insert is inside the deleted range
       return [{ type: 'retain', count: 0 }, { ...op2, count: len2 + (op1.text?.length || 0) }]; // Simplified
     }
  }

  private static transformDeleteInsert(op1: Operation, op2: Operation): [Operation, Operation] {
     const res = this.transformInsertDelete(op2, op1);
     return [res[1], res[0]];
  }

  private static transformDeleteDelete(op1: Operation, op2: Operation): [Operation, Operation] {
    // Simplified logic
    return [op1, op2];
  }
}
