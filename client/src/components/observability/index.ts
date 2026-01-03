// client/src/components/observability/index.ts
export { Dashboard } from './DashboardComponent';
export { default as LineChart } from './charts/LineChartComponent';
export { default as BarChart } from './charts/BarChartComponent';
export { default as PieChart } from './charts/PieChartComponent';
export { default as MetricCard } from './charts/MetricCard';

// Export types
export type { 
  DashboardMetric, 
  ChartDataPoint 
} from './DashboardComponent';