"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpreadsheetOpsEnvironment = void 0;
const env_js_1 = require("../env.js");
class SpreadsheetOpsEnvironment extends env_js_1.BaseEnvironment {
    name = 'SpreadsheetOps';
    data = [];
    async _reset(options) {
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
    async _step(action) {
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
                    }
                    else {
                        success = false;
                        message = 'Invalid cell coordinates';
                    }
                    break;
                case 'read_cell':
                    const r = action.params.row;
                    const c = action.params.col;
                    if (this.isValidCell(r, c)) {
                        message = `Value at (${r}, ${c}): ${this.data[r][c]}`;
                    }
                    else {
                        success = false;
                        message = 'Invalid cell coordinates';
                    }
                    break;
                default:
                    success = false;
                    message = `Unknown action type: ${action.type}`;
            }
        }
        catch (e) {
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
    isValidCell(row, col) {
        return row >= 0 && row < this.data.length && col >= 0 && col < this.data[0].length;
    }
    getObservation() {
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
exports.SpreadsheetOpsEnvironment = SpreadsheetOpsEnvironment;
