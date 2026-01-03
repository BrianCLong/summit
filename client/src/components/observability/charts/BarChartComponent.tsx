// client/src/components/observability/charts/BarChartComponent.tsx
import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface BarChartProps {
  data: Array<Record<string, any>>;
  dataKey: string;
  title?: string;
  xAxisKey?: string;
  yAxisLabel?: string;
  color?: string;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  dataKey,
  title,
  xAxisKey = 'timestamp',
  yAxisLabel,
  color = '#82ca9d',
  height = 300
}) => {
  return (
    <div style={{ width: '100%', height: height }}>
      {title && <h3>{title}</h3>}
      <ResponsiveContainer width="100%" height="90%">
        <RechartsBarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} />
          <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip
            formatter={(value) => [value, dataKey]}
            labelFormatter={(label) => new Date(label).toLocaleString()}
          />
          <Legend />
          <Bar dataKey={dataKey} fill={color} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;