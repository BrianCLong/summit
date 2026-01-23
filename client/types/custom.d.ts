declare const global: any;
declare const process: any;

declare module '@mui/material/Grid' {
  const Grid: any;
  export interface GridProps {
    [key: string]: any;
  }
  export default Grid;
}

declare module '@heroicons/react/*' {
  const Icon: any;
  export default Icon;
}

declare module '@/services/api' {
  const apiClient: any;
  export { apiClient };
  export default apiClient;
}

declare module '@/hooks/*' {
  const hook: any;
  export default hook;
}

declare module '@/components/*' {
  const component: any;
  export default component;
}

declare module '@/*' {
  const mod: any;
  export = mod;
}

// Lightweight shims for legacy dependencies that lack local type packages
declare module 'framer-motion';
declare module 'react-force-graph-2d';
declare module '@deck.gl/react';
declare module '@deck.gl/layers';
declare module 'react-map-gl';
declare module 'maplibre-gl';
declare module 'dagre';
declare module 'react-bootstrap';
declare module 'react-bootstrap-icons';
declare module 'react-hot-toast';
declare module 'dompurify';
declare module 'lodash';
declare module 'd3';
declare module 'react-virtualized';
declare module 'cytoscape-cola';
declare module 'cytoscape-dagre';
declare module 'recharts';
declare module 'reactflow';
declare module 'zustand';
declare module '@storybook/react';
declare module '@dnd-kit/core';
declare module '@jest/globals';
declare module 'graphql-tag';
declare module 'graphql-ws/lib/useWs';
declare module 'clsx';
declare module 'tailwind-merge';
declare module 'class-variance-authority';
declare module '@radix-ui/react-slot';
declare module '@radix-ui/react-label';
declare module '@radix-ui/react-separator';
declare module '@radix-ui/react-slider';
declare module '@radix-ui/react-switch';
declare module '@radix-ui/react-tabs';
declare module 'msw/node';
declare module '@opentelemetry/sdk-trace-web';
declare module '@opentelemetry/sdk-trace-base';
declare module '@opentelemetry/instrumentation';
declare module '@opentelemetry/instrumentation-fetch';
declare module '@opentelemetry/resources';
declare module '@opentelemetry/semantic-conventions';

// Local legacy modules without published types
declare module '../graphql/appeals';
declare module '../../../server/src/risk/RiskEngine';
declare module ' @/components/ai-enhanced/EnhancedAIAssistant';
declare module 'vis-timeline/standalone' {
  export type DataItem = {
    id: string | number;
    content: string;
    start: string | Date;
    group?: string;
    data?: Record<string, unknown>;
  };

  export type TimelineOptions = {
    zoomable?: boolean;
  };

  export class DataSet<T = DataItem> {
    constructor(items?: T[]);
    get(id: string | number): T | undefined;
  }

  export class Timeline {
    constructor(
      container: HTMLElement,
      items: DataSet<DataItem>,
      options?: TimelineOptions,
    );
    on(
      event: 'select',
      callback: (props: { items: Array<string | number> }) => void,
    ): void;
    setItems(items: DataSet<DataItem>): void;
    setWindow(start: Date, end: Date): void;
  }
}
