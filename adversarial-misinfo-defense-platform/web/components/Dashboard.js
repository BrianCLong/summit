/**
 * Dashboard Component for Adversarial Misinformation Defense Platform Web UI
 */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiAlertTriangle, FiCheckCircle, FiActivity, FiBarChart2 } from 'react-icons/fi';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Styled components
const DashboardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  padding: 1rem;
`;

const Card = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
`;

const StatCard = styled(Card)`
  text-align: center;
  background: ${props => props.color || '#3498db'};
  color: white;
`;

const StatValue = styled.h2`
  font-size: 2.5rem;
  margin: 0.5rem 0;
`;

const StatLabel = styled.p`
  font-size: 1rem;
  margin: 0;
  opacity: 0.9;
`;

const ChartContainer = styled.div`
  grid-column: 1 / -1;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1.5rem;
`;

// Dashboard component
const Dashboard = () => {
  const [stats, setStats] = useState({
    total_scenarios: 0,
    active_exercises: 0,
    misinfo_detected: 0,
    accuracy_rate: 0.0
  });
  
  const [chartData, setChartData] = useState(null);
  
  useEffect(() => {
    // Simulate loading data
    const loadData = async () => {
      // In a real implementation, this would fetch from the API
      setStats({
        total_scenarios: 24,
        active_exercises: 3,
        misinfo_detected: 142,
        accuracy_rate: 0.87
      });
      
      // Set up chart data
      setChartData({
        labels: ['Text', 'Image', 'Audio', 'Video', 'Meme', 'Deepfake'],
        datasets: [
          {
            label: 'Detection Accuracy',
            data: [0.88, 0.82, 0.79, 0.81, 0.84, 0.92],
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
          {
            label: 'False Positive Rate',
            data: [0.12, 0.18, 0.21, 0.19, 0.16, 0.08],
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
          }
        ],
      });
    };
    
    loadData();
  }, []);
  
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Detection Performance by Modality',
      },
    },
  };
  
  return (
    <DashboardContainer>
      <StatCard color="#3498db">
        <FiBarChart2 size={32} />
        <StatValue>{stats.total_scenarios}</StatValue>
        <StatLabel>Total Scenarios</StatLabel>
      </StatCard>
      
      <StatCard color="#2ecc71">
        <FiActivity size={32} />
        <StatValue>{stats.active_exercises}</StatValue>
        <StatLabel>Active Exercises</StatLabel>
      </StatCard>
      
      <StatCard color="#e74c3c">
        <FiAlertTriangle size={32} />
        <StatValue>{stats.misinfo_detected}</StatValue>
        <StatLabel>Misinfo Detected</StatLabel>
      </StatCard>
      
      <StatCard color="#9b59b6">
        <FiCheckCircle size={32} />
        <StatValue>{(stats.accuracy_rate * 100).toFixed(1)}%</StatValue>
        <StatLabel>Accuracy Rate</StatLabel>
      </StatCard>
      
      {chartData && (
        <ChartContainer>
          <Bar data={chartData} options={chartOptions} />
        </ChartContainer>
      )}
      
      <Card>
        <h2>Recent Activity</h2>
        <ul>
          <li>Exercise "Social Media Influence Campaign" completed with 87% accuracy</li>
          <li>New scenario "Deepfake Audio Detection" added</li>
          <li>Tactic library updated with 12 new patterns</li>
          <li>Validation benchmark run - all modules passing</li>
        </ul>
      </Card>
      
      <Card>
        <h2>System Status</h2>
        <ul>
          <li>Text Detection: <span style={{color: 'green'}}>Operational</span></li>
          <li>Image Detection: <span style={{color: 'green'}}>Operational</span></li>
          <li>Audio Detection: <span style={{color: 'green'}}>Operational</span></li>
          <li>Video Detection: <span style={{color: 'green'}}>Operational</span></li>
          <li>Meme Detection: <span style={{color: 'green'}}>Operational</span></li>
          <li>Deepfake Detection: <span style={{color: 'green'}}>Operational</span></li>
          <li>Training Engine: <span style={{color: 'orange'}}>Paused</span></li>
        </ul>
      </Card>
    </DashboardContainer>
  );
};

export default Dashboard;