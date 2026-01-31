import { BaseEnvironment } from '../env.js';
import { Observation, Action, StepResult } from '../types.js';

export class SpreadsheetOpsEnvironment extends BaseEnvironment {
  public name = 'SpreadsheetOps';
  private data: (string | number)[][] = [];

  protected async _reset(options?: Record<string, any>): Promise<Observation> {
    const rows = options?.rows || 10;
    const cols = options?.cols || 5;
    this.data = Array(rows).fill(null).map(() => Array(cols).fill(''));

    // Seed some data
    this.data[0][0] = 'Item';
    this.data[0][1] = 'Cost';
    this.data[1][0] = 'Apple';
    this.data[1][1] = 1.50;
    this.data[2][0] = 'Banana';
    this.data[2][1] = 0.80;

    return this.getObservation();
  }

  protected async _step(action: Action): Promise<StepResult> {
    let success = true;
    let message = 'Action completed';
    let reward = 0;

    try {
        switch (action.type) {
            case 'write_cell':
                const { row, col, value } = action.params;
                if (this.isValidCell(row, col)) {
                    this.data[row][col] = value;
                    message = `Wrote "${value}" to (${row}, ${col})`;
                } else {
                    success = false;
                    message = 'Invalid cell coordinates';
                }
                break;
            case 'read_cell':
                const r = action.params.row;
                const c = action.params.col;
                if (this.isValidCell(r, c)) {
                    message = `Value at (${r}, ${c}): ${this.data[r][c]}`;
                } else {
                    success = false;
                    message = 'Invalid cell coordinates';
                }
                break;
            default:
                success = false;
                message = `Unknown action type: ${action.type}`;
        }
    } catch (e: any) {
        success = false;
        message = e.message;
    }

    return {
      observation: this.getObservation(),
      feedback: { success, message, reward },
      done: false,
      info: {}
    };
  }

  private isValidCell(row: number, col: number): boolean {
      return row >= 0 && row < this.data.length && col >= 0 && col < this.data[0].length;
  }

  private getObservation(): Observation {
    return {
      type: 'json',
      content: {
        sheet: this.data,
        rowCount: this.data.length,
        colCount: this.data[0]?.length || 0
      },
      timestamp: Date.now()
    };
  }
}
