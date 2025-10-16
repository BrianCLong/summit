import type { UndoRedoCommand } from './types.js';

export class UndoRedoManager<TState> {
  private readonly history: UndoRedoCommand<TState>[] = [];
  private readonly undone: UndoRedoCommand<TState>[] = [];
  private state: TState;

  constructor(initialState: TState) {
    this.state = initialState;
  }

  get current(): TState {
    return this.state;
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  get canRedo(): boolean {
    return this.undone.length > 0;
  }

  execute(command: UndoRedoCommand<TState>): TState {
    this.state = command.apply(this.state);
    this.history.push(command);
    this.undone.length = 0;
    return this.state;
  }

  undo(): TState {
    if (!this.canUndo) {
      throw new Error('No actions to undo');
    }
    const command = this.history.pop()!;
    this.state = command.revert(this.state);
    this.undone.push(command);
    return this.state;
  }

  redo(): TState {
    if (!this.canRedo) {
      throw new Error('No actions to redo');
    }
    const command = this.undone.pop()!;
    this.state = command.apply(this.state);
    this.history.push(command);
    return this.state;
  }

  snapshot(): {
    history: readonly UndoRedoCommand<TState>[];
    redo: readonly UndoRedoCommand<TState>[];
  } {
    return {
      history: [...this.history],
      redo: [...this.undone],
    };
  }
}
