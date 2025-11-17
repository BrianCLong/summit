/**
 * Type declarations for external modules and legacy dependencies
 * that don't have type definitions or are not yet migrated
 */

// jQuery - legacy dependency
declare module 'jquery' {
  const jQuery: any;
  export = jQuery;
}

// Redux Toolkit - may need to be installed
declare module '@reduxjs/toolkit' {
  export * from '@reduxjs/toolkit';
  export const createSlice: any;
  export const createAsyncThunk: any;
  export const createSelector: any;
  export const configureStore: any;
  export type PayloadAction<T = any> = {
    payload: T;
    type: string;
  };
  export type Middleware = any;
}

// React Redux
declare module 'react-redux' {
  export * from 'react-redux';
  export const useSelector: any;
  export const useDispatch: any;
  export const Provider: any;
}

// Immer
declare module 'immer' {
  export * from 'immer';
  export const produce: any;
  export const Draft: any;
  export const applyPatches: any;
  export const enablePatches: any;
}

// DOMPurify
declare module 'dompurify' {
  const DOMPurify: {
    sanitize: (dirty: string, config?: any) => string;
  };
  export default DOMPurify;
}

// Lodash
declare module 'lodash' {
  export * from 'lodash';
  const lodash: any;
  export default lodash;
}

// Cytoscape
declare module 'cytoscape' {
  const cytoscape: any;
  export default cytoscape;
}

// Mermaid
declare module 'mermaid' {
  const mermaid: {
    initialize: (config: any) => void;
    render: (id: string, text: string, callback?: (svg: string) => void) => void;
  };
  export default mermaid;
}

// MUI Data Grid
declare module '@mui/x-data-grid' {
  export * from '@mui/x-data-grid';
  export const DataGrid: any;
  export const GridColDef: any;
}

// Radix UI Slot
declare module '@radix-ui/react-slot' {
  import type { ComponentType, HTMLAttributes } from 'react';

  export interface SlotProps extends HTMLAttributes<HTMLElement> {
    children?: React.ReactNode;
  }

  export const Slot: ComponentType<SlotProps>;
}

// Internal monorepo packages
declare module '@intelgraph/graph-algos-js' {
  export const graphAlgos: any;
  export const pagerank: any;
}

declare module '../../../../packages/sdk/collab-js/src/collabClient' {
  export const CollabClient: any;
}

// Internal slice files that may not exist yet
declare module '../viewSync/viewSyncSlice' {
  export const viewSyncSlice: any;
}

declare module '../features/viewSync/viewSyncSlice' {
  export const viewSyncSlice: any;
}

declare module '../features/codex/codexSlice' {
  export const codexSlice: any;
}
