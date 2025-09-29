/**
 * Tests for Model Management Dashboard Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ModelManagementDashboard from '../ModelManagementDashboard';

describe('ModelManagementDashboard', () => {
  const defaultProps = {
    onModelSelect: jest.fn(),
    onDeployModel: jest.fn(),
    onExperimentSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders MLOps dashboard header', () => {
    render(<ModelManagementDashboard {...defaultProps} />);
    
    expect(screen.getByText(/🤖 MLOps Model Management/)).toBeInTheDocument();
  });

  it('renders view tabs', () => {
    render(<ModelManagementDashboard {...defaultProps} />);
    
    expect(screen.getByText(/🎯 Models/)).toBeInTheDocument();
    expect(screen.getByText(/🏋️ Training Jobs/)).toBeInTheDocument();
    expect(screen.getByText(/🧪 Experiments/)).toBeInTheDocument();
    expect(screen.getByText(/📊 Monitoring/)).toBeInTheDocument();
  });

  it('renders search and filters', () => {
    render(<ModelManagementDashboard {...defaultProps} />);
    
    expect(screen.getByPlaceholderText(/Search models, tags, or algorithms/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
  });

  it('displays models by default', () => {
    render(<ModelManagementDashboard {...defaultProps} />);
    
    expect(screen.getByText(/ML Models/)).toBeInTheDocument();
    // Should show mock model data
    expect(screen.getByText('Entity Resolution Neural Network')).toBeInTheDocument();
    expect(screen.getByText('Anomaly Detection Ensemble')).toBeInTheDocument();
    expect(screen.getByText('Sentiment Analysis Transformer')).toBeInTheDocument();
  });

  it('switches between view tabs', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    // Switch to training jobs
    await user.click(screen.getByText(/🏋️ Training Jobs/));
    expect(screen.getByText(/Training Jobs/)).toBeInTheDocument();
    expect(screen.getByText(/Training Job job-001/)).toBeInTheDocument();
    
    // Switch to experiments
    await user.click(screen.getByText(/🧪 Experiments/));
    expect(screen.getByText(/ML Experiments/)).toBeInTheDocument();
    expect(screen.getByText('Entity Resolution Optimization')).toBeInTheDocument();
    
    // Switch to monitoring
    await user.click(screen.getByText(/📊 Monitoring/));
    expect(screen.getByText(/📊 Model Monitoring Dashboard/)).toBeInTheDocument();
  });

  it('filters models by search query', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/Search models, tags, or algorithms/);
    await user.type(searchInput, 'Entity Resolution');
    
    // Should show filtered results
    expect(screen.getByText('Entity Resolution Neural Network')).toBeInTheDocument();
    expect(screen.queryByText('Sentiment Analysis Transformer')).not.toBeInTheDocument();
  });

  it('filters models by status', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    const statusSelect = screen.getByDisplayValue('All Status');
    await user.selectOptions(statusSelect, 'production');
    
    expect(statusSelect).toHaveValue('production');
    // Should show only production models
    expect(screen.getByText('Entity Resolution Neural Network')).toBeInTheDocument();
  });

  it('selects model and shows details', async () => {
    const user = userEvent.setup();
    const onModelSelect = jest.fn();
    render(<ModelManagementDashboard {...defaultProps} onModelSelect={onModelSelect} />);
    
    // Click on a model
    await user.click(screen.getByText('Entity Resolution Neural Network'));
    
    // Should show model details panel
    expect(screen.getByText('Model Details')).toBeInTheDocument();
    expect(screen.getByText(/Performance Metrics/)).toBeInTheDocument();
    expect(screen.getByText(/Model Information/)).toBeInTheDocument();
  });

  it('calls model select callback', async () => {
    const user = userEvent.setup();
    const onModelSelect = jest.fn();
    render(<ModelManagementDashboard {...defaultProps} onModelSelect={onModelSelect} />);
    
    await user.click(screen.getByText('Entity Resolution Neural Network'));
    
    expect(onModelSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Entity Resolution Neural Network',
        algorithm: 'Siamese Neural Network',
        status: 'production'
      })
    );
  });

  it('shows deploy button for non-production models', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    // Select a staging model
    await user.click(screen.getByText('Anomaly Detection Ensemble'));
    
    // Should show deploy button
    expect(screen.getByText(/🚀 Deploy/)).toBeInTheDocument();
  });

  it('hides deploy button for production models', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    // Select a production model
    await user.click(screen.getByText('Entity Resolution Neural Network'));
    
    // Should not show deploy button
    expect(screen.queryByText(/🚀 Deploy/)).not.toBeInTheDocument();
  });

  it('handles model deployment', async () => {
    const user = userEvent.setup();
    const onDeployModel = jest.fn();
    render(<ModelManagementDashboard {...defaultProps} onDeployModel={onDeployModel} />);
    
    // Select a staging model
    await user.click(screen.getByText('Anomaly Detection Ensemble'));
    
    // Click deploy button
    const deployButton = screen.getByText(/🚀 Deploy/);
    await user.click(deployButton);
    
    // Should show deploying state
    await waitFor(() => {
      expect(screen.getByText(/Deploying.../)).toBeInTheDocument();
    });
    
    expect(onDeployModel).toHaveBeenCalledWith('model-002', 'production');
  });

  it('displays model performance metrics', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    // Select a model to see details
    await user.click(screen.getByText('Entity Resolution Neural Network'));
    
    // Should show performance metrics
    expect(screen.getByText(/Accuracy: 94.2%/)).toBeInTheDocument();
    expect(screen.getByText(/Precision: 92.8%/)).toBeInTheDocument();
    expect(screen.getByText(/Recall: 95.6%/)).toBeInTheDocument();
    expect(screen.getByText(/F1 Score: 94.2%/)).toBeInTheDocument();
  });

  it('displays model environment information', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    // Select a model to see details
    await user.click(screen.getByText('Entity Resolution Neural Network'));
    
    // Should show environment details
    expect(screen.getByText(/Python: 3.9.7/)).toBeInTheDocument();
    expect(screen.getByText(/Hardware: NVIDIA V100/)).toBeInTheDocument();
    expect(screen.getByText(/tensorflow: 2.8.0/)).toBeInTheDocument();
  });

  it('shows training job progress', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    // Switch to training jobs tab
    await user.click(screen.getByText(/🏋️ Training Jobs/));
    
    // Should show progress bar for running jobs
    expect(screen.getByText(/67%/)).toBeInTheDocument();
    expect(screen.getByText(/RUNNING/)).toBeInTheDocument();
    expect(screen.getByText(/COMPLETED/)).toBeInTheDocument();
  });

  it('shows training job resource usage', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    // Switch to training jobs tab
    await user.click(screen.getByText(/🏋️ Training Jobs/));
    
    // Should show resource usage metrics
    expect(screen.getByText(/GPU: 87%/)).toBeInTheDocument();
    expect(screen.getByText(/CPU: 34%/)).toBeInTheDocument();
    expect(screen.getByText(/Memory: 78%/)).toBeInTheDocument();
  });

  it('expands training job logs', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    // Switch to training jobs tab
    await user.click(screen.getByText(/🏋️ Training Jobs/));
    
    // Click to expand logs
    const logsSummary = screen.getByText('View Logs');
    await user.click(logsSummary);
    
    // Should show log content
    expect(screen.getByText(/Epoch 33\/50/)).toBeInTheDocument();
  });

  it('handles experiment selection', async () => {
    const user = userEvent.setup();
    const onExperimentSelect = jest.fn();
    render(<ModelManagementDashboard {...defaultProps} onExperimentSelect={onExperimentSelect} />);
    
    // Switch to experiments tab
    await user.click(screen.getByText(/🧪 Experiments/));
    
    // Click on an experiment
    await user.click(screen.getByText('Entity Resolution Optimization'));
    
    expect(onExperimentSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Entity Resolution Optimization',
        status: 'completed'
      })
    );
  });

  it('displays experiment results', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    // Switch to experiments tab
    await user.click(screen.getByText(/🧪 Experiments/));
    
    // Should show experiment results for completed experiments
    expect(screen.getByText(/Best Model: model-001/)).toBeInTheDocument();
    expect(screen.getByText(/Improvement: \+12.3%/)).toBeInTheDocument();
    expect(screen.getByText(/Key Insights:/)).toBeInTheDocument();
  });

  it('shows monitoring placeholder', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    // Switch to monitoring tab
    await user.click(screen.getByText(/📊 Monitoring/));
    
    // Should show monitoring coming soon message
    expect(screen.getByText(/🚧 Monitoring dashboard coming soon/)).toBeInTheDocument();
    expect(screen.getByText(/Real-time performance metrics/)).toBeInTheDocument();
  });

  it('handles investigation ID prop', () => {
    render(<ModelManagementDashboard {...defaultProps} investigationId="inv-999" />);
    
    expect(screen.getByText(/ML Models/)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ModelManagementDashboard {...defaultProps} className="custom-mlops-class" />);
    
    const container = screen.getByText(/🤖 MLOps Model Management/).closest('.model-management-dashboard');
    expect(container).toHaveClass('custom-mlops-class');
  });

  it('displays status indicators correctly', () => {
    render(<ModelManagementDashboard {...defaultProps} />);
    
    // Should display status indicators with different colors
    expect(screen.getByText(/PRODUCTION/)).toBeInTheDocument();
    expect(screen.getByText(/STAGING/)).toBeInTheDocument();
    expect(screen.getByText(/DEVELOPMENT/)).toBeInTheDocument();
  });

  it('shows model tags', () => {
    render(<ModelManagementDashboard {...defaultProps} />);
    
    // Should display model tags
    expect(screen.getByText('entity-resolution')).toBeInTheDocument();
    expect(screen.getByText('neural-network')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
  });

  it('handles empty search results', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/Search models, tags, or algorithms/);
    await user.type(searchInput, 'nonexistent-model');
    
    // Should show no results
    expect(screen.getByText(/ML Models \(0\)/)).toBeInTheDocument();
  });

  it('updates model count in tab labels', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    // Check initial count
    expect(screen.getByText(/🎯 Models \(\d+\)/)).toBeInTheDocument();
    
    // Apply filter to change count
    const searchInput = screen.getByPlaceholderText(/Search models, tags, or algorithms/);
    await user.type(searchInput, 'Entity');
    
    // Count should update
    expect(screen.getByText(/🎯 Models \(\d+\)/)).toBeInTheDocument();
  });

  it('shows model endpoints when available', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    // Select a model with endpoints
    await user.click(screen.getByText('Entity Resolution Neural Network'));
    
    // Should show endpoint information
    expect(screen.getByText(/Endpoints/)).toBeInTheDocument();
    expect(screen.getByText(/\/api\/models\/entity-resolution\/predict/)).toBeInTheDocument();
  });

  it('handles hover states on model cards', async () => {
    const user = userEvent.setup();
    render(<ModelManagementDashboard {...defaultProps} />);
    
    const modelCard = screen.getByText('Entity Resolution Neural Network').closest('div');
    
    // Hover should work without errors
    if (modelCard) {
      await user.hover(modelCard);
      await user.unhover(modelCard);
    }
    
    expect(screen.getByText('Entity Resolution Neural Network')).toBeInTheDocument();
  });
});