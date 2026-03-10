import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { CommandMode, WorkspaceLayout, PanelConfig, CommandContext } from './types';

interface CommandState {
  context: CommandContext;
  isCommandPaletteOpen: boolean;
}

type CommandAction =
  | { type: 'SET_MODE'; mode: CommandMode }
  | { type: 'SET_MISSION'; missionId: string | null }
  | { type: 'SET_INVESTIGATION'; investigationId: string | null }
  | { type: 'SET_LAYOUT'; layout: WorkspaceLayout }
  | { type: 'UPDATE_PANEL'; panel: PanelConfig }
  | { type: 'TOGGLE_COMMAND_PALETTE' }
  | { type: 'CLOSE_COMMAND_PALETTE' };

const defaultLayout: WorkspaceLayout = {
  id: 'default',
  name: 'Default Layout',
  panels: [],
  mode: 'observe',
  createdBy: 'system',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDefault: true,
};

const initialState: CommandState = {
  context: {
    activeMode: 'observe',
    activeMissionId: null,
    activeInvestigationId: null,
    layout: defaultLayout,
    operatorId: '',
    sessionId: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
  },
  isCommandPaletteOpen: false,
};

function commandReducer(state: CommandState, action: CommandAction): CommandState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        context: { ...state.context, activeMode: action.mode },
      };
    case 'SET_MISSION':
      return {
        ...state,
        context: { ...state.context, activeMissionId: action.missionId },
      };
    case 'SET_INVESTIGATION':
      return {
        ...state,
        context: { ...state.context, activeInvestigationId: action.investigationId },
      };
    case 'SET_LAYOUT':
      return {
        ...state,
        context: { ...state.context, layout: action.layout },
      };
    case 'UPDATE_PANEL': {
      const panels = state.context.layout.panels.map((p) =>
        p.id === action.panel.id ? action.panel : p
      );
      return {
        ...state,
        context: {
          ...state.context,
          layout: { ...state.context.layout, panels },
        },
      };
    }
    case 'TOGGLE_COMMAND_PALETTE':
      return { ...state, isCommandPaletteOpen: !state.isCommandPaletteOpen };
    case 'CLOSE_COMMAND_PALETTE':
      return { ...state, isCommandPaletteOpen: false };
    default:
      return state;
  }
}

interface CommandContextValue {
  state: CommandState;
  setMode: (mode: CommandMode) => void;
  setMission: (missionId: string | null) => void;
  setInvestigation: (investigationId: string | null) => void;
  setLayout: (layout: WorkspaceLayout) => void;
  updatePanel: (panel: PanelConfig) => void;
  toggleCommandPalette: () => void;
  closeCommandPalette: () => void;
}

const CommandCtx = createContext<CommandContextValue | null>(null);

export function CommandContextProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(commandReducer, initialState);

  const setMode = useCallback((mode: CommandMode) => dispatch({ type: 'SET_MODE', mode }), []);
  const setMission = useCallback((missionId: string | null) => dispatch({ type: 'SET_MISSION', missionId }), []);
  const setInvestigation = useCallback((investigationId: string | null) => dispatch({ type: 'SET_INVESTIGATION', investigationId }), []);
  const setLayout = useCallback((layout: WorkspaceLayout) => dispatch({ type: 'SET_LAYOUT', layout }), []);
  const updatePanel = useCallback((panel: PanelConfig) => dispatch({ type: 'UPDATE_PANEL', panel }), []);
  const toggleCommandPalette = useCallback(() => dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }), []);
  const closeCommandPalette = useCallback(() => dispatch({ type: 'CLOSE_COMMAND_PALETTE' }), []);

  return (
    <CommandCtx.Provider
      value={{ state, setMode, setMission, setInvestigation, setLayout, updatePanel, toggleCommandPalette, closeCommandPalette }}
    >
      {children}
    </CommandCtx.Provider>
  );
}

export function useCommandContext(): CommandContextValue {
  const ctx = useContext(CommandCtx);
  if (!ctx) throw new Error('useCommandContext must be used within CommandContextProvider');
  return ctx;
}
