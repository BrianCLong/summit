import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Run 1', success: 0.1, looping: 0.8 },
  { name: 'Run 2', success: 0.3, looping: 0.6 },
  { name: 'Run 3', success: 0.5, looping: 0.4 },
  { name: 'Run 4', success: 0.7, looping: 0.2 },
  { name: 'Run 5', success: 0.8, looping: 0.1 },
];

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Summit Agent Gym Dashboard</h1>
      <p>Regression Analysis: Success Rate vs Looping Index</p>

      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="success" stroke="#8884d8" name="Success Rate" />
            <Line type="monotone" dataKey="looping" stroke="#82ca9d" name="Looping Index" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default App;
