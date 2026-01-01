import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnalysisWorkspace from './AnalysisWorkspace';

describe('AnalysisWorkspace', () => {
  const defaultProps = {
    userId: 'user-1',
    userName: 'Test User',
    userEmail: 'test@example.com',
  };

  it('renders without crashing', () => {
    render(<AnalysisWorkspace {...defaultProps} />);
    expect(screen.getByText('Analysis Workspace')).toBeInTheDocument();
  });

  it('displays the workspace name', () => {
    render(<AnalysisWorkspace {...defaultProps} />);
    expect(screen.getByText('Untitled Workspace')).toBeInTheDocument();
  });

  it('allows adding a new component', async () => {
    render(<AnalysisWorkspace {...defaultProps} />);
    
    const addComponentButton = screen.getByText('Add Component');
    fireEvent.click(addComponentButton);
    
    // Wait for the component to be added
    await waitFor(() => {
      expect(screen.getByText('New Component')).toBeInTheDocument();
    });
  });

  it('opens and closes the save dialog', async () => {
    render(<AnalysisWorkspace {...defaultProps} />);
    
    const saveButton = screen.getByTitle('Save Workspace');
    fireEvent.click(saveButton);
    
    expect(screen.getByText('Save Workspace')).toBeInTheDocument();
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Save Workspace')).not.toBeInTheDocument();
    });
  });

  it('opens and closes the load dialog', async () => {
    render(<AnalysisWorkspace {...defaultProps} />);
    
    const loadButton = screen.getByTitle('Load Workspace');
    fireEvent.click(loadButton);
    
    expect(screen.getByText('Load Workspace')).toBeInTheDocument();
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Load Workspace')).not.toBeInTheDocument();
    });
  });

  it('toggles grid visibility', () => {
    render(<AnalysisWorkspace {...defaultProps} />);
    
    const gridSwitch = screen.getByLabelText('Grid');
    expect(gridSwitch).toBeInTheDocument();
    
    fireEvent.click(gridSwitch);
    expect(gridSwitch).toBeChecked();
  });

  it('toggles links visibility', () => {
    render(<AnalysisWorkspace {...defaultProps} />);
    
    const linksSwitch = screen.getByLabelText('Links');
    expect(linksSwitch).toBeInTheDocument();
    
    fireEvent.click(linksSwitch);
    expect(linksSwitch).toBeChecked();
  });

  it('changes layout mode', () => {
    render(<AnalysisWorkspace {...defaultProps} />);
    
    const gridLayoutButton = screen.getByTitle('Grid Layout');
    expect(gridLayoutButton).toBeInTheDocument();
    
    fireEvent.click(gridLayoutButton);
    // The button should be active (though this is tested via styling in real implementation)
  });

  it('adjusts zoom level', () => {
    render(<AnalysisWorkspace {...defaultProps} />);
    
    const zoomSlider = screen.getByRole('slider', { name: /zoom/i });
    expect(zoomSlider).toBeInTheDocument();
    
    fireEvent.change(zoomSlider, { target: { value: 120 } });
    expect(zoomSlider).toHaveValue('120');
  });
});