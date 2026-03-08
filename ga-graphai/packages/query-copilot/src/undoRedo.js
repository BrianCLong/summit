"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UndoRedoManager = void 0;
class UndoRedoManager {
    history = [];
    undone = [];
    state;
    constructor(initialState) {
        this.state = initialState;
    }
    get current() {
        return this.state;
    }
    get canUndo() {
        return this.history.length > 0;
    }
    get canRedo() {
        return this.undone.length > 0;
    }
    execute(command) {
        this.state = command.apply(this.state);
        this.history.push(command);
        this.undone.length = 0;
        return this.state;
    }
    undo() {
        if (!this.canUndo) {
            throw new Error('No actions to undo');
        }
        const command = this.history.pop();
        this.state = command.revert(this.state);
        this.undone.push(command);
        return this.state;
    }
    redo() {
        if (!this.canRedo) {
            throw new Error('No actions to redo');
        }
        const command = this.undone.pop();
        this.state = command.apply(this.state);
        this.history.push(command);
        return this.state;
    }
    snapshot() {
        return {
            history: [...this.history],
            redo: [...this.undone],
        };
    }
}
exports.UndoRedoManager = UndoRedoManager;
