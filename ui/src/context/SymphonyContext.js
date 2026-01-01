import React, { createContext, useContext, useReducer } from 'react';

// Create the context
const SymphonyContext = createContext();

// Initial state
const initialState = {
  systemStatus: null,
  lastUpdate: new Date(),
  config: {
    PROXY_BASE: 'http://127.0.0.1:8787',
    LITELLM_BASE: 'http://127.0.0.1:4000',
    OLLAMA_BASE: 'http://127.0.0.1:11434',
  },
  theme: 'light', // light or dark
};

// Reducer for state management
const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_SYSTEM_STATUS':
      return { ...state, systemStatus: action.payload };
    case 'UPDATE_LAST_UPDATE':
      return { ...state, lastUpdate: action.payload };
    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    default:
      return state;
  }
};

// Provider component
export const SymphonyProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setSystemStatus = (status) => {
    dispatch({ type: 'SET_SYSTEM_STATUS', payload: status });
    dispatch({ type: 'UPDATE_LAST_UPDATE', payload: new Date() });
  };

  const updateConfig = (config) => {
    dispatch({ type: 'SET_CONFIG', payload: config });
  };

  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  return (
    <SymphonyContext.Provider
      value={{
        ...state,
        setSystemStatus,
        updateConfig,
        toggleTheme,
      }}
    >
      {children}
    </SymphonyContext.Provider>
  );
};

// Custom hook to use the Symphony context
export const useSymphony = () => {
  const context = useContext(SymphonyContext);
  if (!context) {
    throw new Error('useSymphony must be used within a SymphonyProvider');
  }
  return context;
};