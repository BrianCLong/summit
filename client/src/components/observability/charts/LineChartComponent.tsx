// client/src/components/observability/charts/LineChartComponent.tsx
import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface LineChartProps {
  data: Array<Record<string, any>>;
  dataKey: string;
  title?: string;
  xAxisKey?: string;
  yAxisLabel?: string;
  color?: string;
  strokeWidth?: number;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  dataKey,
  title,
  xAxisKey = 'timestamp',
  yAxisLabel,
  color = '#8884d8',
  strokeWidth = 2,
  height = 300
}) => {
  return (
    <div style={{ width: '100%', height: height }}>
      {title && <h3>{title}</h3>}
      <ResponsiveContainer width="100%" height="90%">
        <RechartsLineChart
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
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            activeDot={{ r: 8 }}
            strokeWidth={strokeWidth}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;