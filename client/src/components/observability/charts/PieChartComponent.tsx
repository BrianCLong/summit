// client/src/components/observability/charts/PieChartComponent.tsx
import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label
} from 'recharts';

interface PieChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  title?: string;
  dataKey?: string;
  nameKey?: string;
  height?: number;
  colors?: string[];
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  dataKey = 'value',
  nameKey = 'name',
  height = 300,
  colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']
}) => {
  return (
    <div style={{ width: '100%', height: height }}>
      {title && <h3>{title}</h3>}
      <ResponsiveContainer width="100%" height="90%">
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            outerRadius={80}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name, props) => [value, `${name}`]}
          />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChart;