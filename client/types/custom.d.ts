declare const global: any;
declare const process: any;

import '@mui/material';

declare module '@mui/material' {
  interface GridProps {
    [key: string]: any;
  }
  interface GridBaseProps {
    [key: string]: any;
  }
  interface GridOwnProps {
    [key: string]: any;
  }
}

declare module '@mui/material/Grid' {
  import { GridProps } from '@mui/material';
  const Grid: React.FC<GridProps>;
  export { GridProps };
  export default Grid;
}

declare module '@heroicons/react/*' {
  const Icon: any;
  export default Icon;
}

declare module '@/services/api' {
  export const apiClient: any;
  export const apiFetch: any;
  export const getAuthHeaders: any;
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
declare module 'framer-motion' { export const motion: any; export const AnimatePresence: any; }
declare module 'react-force-graph-2d' { export const ForceGraph2D: any; export default ForceGraph2D; }
declare module '@deck.gl/react' { export const DeckGL: any; export default DeckGL; }
declare module '@deck.gl/layers' { export const GeoJsonLayer: any; export const IconLayer: any; }
declare module 'react-bootstrap' { export const Alert: any; export const Button: any; export const Card: any; export const Form: any; export const Modal: any; export const Badge: any; export const Tooltip: any; export const Row: any; export const Col: any; export const Container: any; export const Select: any; export const Nav: any; export const Navbar: any; export const Dropdown: any; export const Spinner: any; export const ProgressBar: any; export const Table: any; export const ListGroup: any; export const Breadcrumb: any; export const Pagination: any; export const Tabs: any; export const Tab: any; export const Accordion: any; export const Carousel: any; export const Offcanvas: any; export const Toast: any; export const Popover: any; export const Overlay: any; export const OverlayTrigger: any; }
declare module 'react-bootstrap-icons' { export const InfoCircle: any; export const ExclamationTriangle: any; export const Clock: any; export const Shield: any; export const FileText: any; export const Search: any; export const Plus: any; export const Trash: any; export const Pencil: any; export const Check: any; export const X: any; export const ArrowRight: any; export const ArrowLeft: any; export const Gear: any; export const Person: any; export const Bell: any; export const GraphUp: any; export const List: any; export const Grid: any; export const Box: any; export const Database: any; export const Cloud: any; export const Link: any; export const Filter: any; export const Download: any; export const Upload: any; export const Eye: any; export const EyeSlash: any; export const Lock: any; export const Unlock: any; export const Key: any; }
declare module 'react-map-gl' { const mod: any; export default mod; }
declare module 'maplibre-gl' { const mod: any; export default mod; }
declare module '@opentelemetry/sdk-trace-web';
declare module '@opentelemetry/instrumentation-fetch';
declare module 'graphql-ws/lib/useWs';
declare module 'react-virtualized';
declare module 'cytoscape-cola';
declare module 'cytoscape-dagre';
declare module '@storybook/react';
declare module '@dnd-kit/core';
declare module '@jest/globals';
declare module 'graphql-tag';
declare module 'clsx';
declare module 'tailwind-merge';
declare module 'class-variance-authority';
declare module '@radix-ui/react-slot' { export const Slot: any; }
declare module '@radix-ui/react-label' { export const Root: any; export const Label: any; export default Root; }
declare module '@radix-ui/react-separator' { export const Root: any; export const Separator: any; export default Root; }
declare module '@radix-ui/react-slider' { export const Root: any; export const Track: any; export const Range: any; export const Thumb: any; }
declare module '@radix-ui/react-switch' { export const Root: any; export const Thumb: any; }
declare module '@radix-ui/react-tabs' { export const Root: any; export const List: any; export const Trigger: any; export const Content: any; }
declare module '@radix-ui/react-dialog' { export const Root: any; export const Trigger: any; export const Content: any; export const Header: any; export const Footer: any; export const Title: any; export const Description: any; export const Portal: any; export const Overlay: any; }
declare module '@radix-ui/react-scroll-area' { export const Root: any; export const Viewport: any; export const Scrollbar: any; export const Thumb: any; export const Corner: any; }
declare module '@radix-ui/react-tooltip' { export const Root: any; export const Trigger: any; export const Content: any; export const Portal: any; export const Provider: any; }
declare module '@radix-ui/react-select' { export const Root: any; export const Trigger: any; export const Value: any; export const Content: any; export const Item: any; export const ItemText: any; export const ItemIndicator: any; export const Group: any; export const Label: any; export const Separator: any; export const Portal: any; export const ScrollUpButton: any; export const ScrollDownButton: any; export const Viewport: any; }
declare module '@radix-ui/react-popover' { export const Root: any; export const Trigger: any; export const Content: any; export const Portal: any; }
declare module '@radix-ui/react-dropdown-menu' { export const Root: any; export const Trigger: any; export const Content: any; export const Item: any; export const CheckboxItem: any; export const RadioItem: any; export const ItemIndicator: any; export const RadioGroup: any; export const Label: any; export const Separator: any; export const Sub: any; export const SubTrigger: any; export const SubContent: any; export const Portal: any; }
declare module '@deck.gl/react' { export const DeckGL: any; export default DeckGL; }
declare module '@deck.gl/layers' { export const GeoJsonLayer: any; export const IconLayer: any; export const ScatterplotLayer: any; export const ArcLayer: any; }
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

declare module 'recharts' {
  export const ResponsiveContainer: any;
  export const LineChart: any;
  export const Line: any;
  export const XAxis: any;
  export const YAxis: any;
  export const CartesianGrid: any;
  export const Tooltip: any;
  export const ReferenceLine: any;
  export const AreaChart: any;
  export const Area: any;
  export const BarChart: any;
  export const Bar: any;
  export const Cell: any;
  export const PieChart: any;
  export const Pie: any;
  export const Legend: any;
  export default any;
}
