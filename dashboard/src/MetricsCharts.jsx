import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const MetricsCharts = () => {
  // ER Performance Data
  const erData = [
    { name: 'Week 1', precision: 75.2, target: 90 },
    { name: 'Week 2', precision: 78.8, target: 90 },
    { name: 'Week 3', precision: 82.1, target: 90 },
    { name: 'Week 4', precision: 84.5, target: 90 },
    { name: 'Week 5', precision: 85.9, target: 90 },
    { name: 'Week 6', precision: 86.7, target: 90 },
    { name: 'Week 7', precision: 87.1, target: 90 },
    { name: 'Week 8', precision: 87.3, target: 90 },
  ];

  // RAG Quality Data
  const ragData = [
    { name: 'Citation Hit-Rate', current: 92.1, target: 90 },
    { name: 'Hallucination Rate', current: 4.2, target: 5 },
    { name: 'Source Accuracy', current: 95.8, target: 95 },
  ];

  // Policy Data
  const policyData = [
    { name: 'Blocks with Reason', value: 985 },
    { name: 'Blocks without Reason', value: 15 },
    { name: 'Appeals Processed', value: 120 },
    { name: 'Appeals Pending', value: 8 },
  ];
  const policyColors = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b'];

  // Health Data
  const healthData = [
    { subject: 'Performance', A: 85 },
    { subject: 'Security', A: 95 },
    { subject: 'Reliability', A: 90 },
    { subject: 'Scalability', A: 88 },
    { subject: 'Usability', A: 82 },
    { subject: 'Compliance', A: 92 },
  ];

  return (
    <div className="metrics-grid">
      <div className="chart-card">
        <h3>ER Performance Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={erData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[70, 95]} />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="precision" 
              name="Precision@10 (%)" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="target" 
              name="Target" 
              stroke="#10b981" 
              strokeDasharray="5 5"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>RAG Quality Metrics</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ragData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="current" name="Current (%)" fill="#10b981" />
            <Bar dataKey="target" name="Target (%)" fill="#10b981" fillOpacity={0.3} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>Policy Enforcement Stats</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={policyData}
              cx="50%"
              cy="50%"
              labelLine={true}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {policyData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={policyColors[index % policyColors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>System Health Overview</h3>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={healthData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar
              name="GA Readiness"
              dataKey="A"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.2}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MetricsCharts;