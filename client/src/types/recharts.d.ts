declare module 'recharts' {
  import * as React from 'react';
  export const ResponsiveContainer: React.FC<{ width?: string | number; height?: string | number; } & React.HTMLAttributes<HTMLDivElement>>;
  export const AreaChart: React.FC<any>;
  export const LineChart: React.FC<any>;
  export const BarChart: React.FC<any>;
  export const XAxis: React.FC<any>;
  export const YAxis: React.FC<any>;
  export const Tooltip: React.FC<any>;
  export const Area: React.FC<any>;
  export const Line: React.FC<any>;
  export const Bar: React.FC<any>;
}
