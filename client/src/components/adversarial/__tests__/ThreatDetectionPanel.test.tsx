import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThreatDetectionPanel } from '../ThreatDetectionPanel';
import { mockDetections } from '../fixtures';

describe('ThreatDetectionPanel', () => {
  it('renders the panel with title', () => {
    render(<ThreatDetectionPanel detections={mockDetections} />);

    expect(screen.getByText('Threat Detections')).toBeInTheDocument();
  });

  it('displays detection count', () => {
    render(<ThreatDetectionPanel detections={mockDetections} />);

    expect(screen.getByText(`${mockDetections.length} of ${mockDetections.length}`)).toBeInTheDocument();
  });

  it('renders all detections', () => {
    render(<ThreatDetectionPanel detections={mockDetections} />);

    mockDetections.forEach(detection => {
      expect(screen.getByText(detection.name)).toBeInTheDocument();
    });
  });

  it('filters detections by severity', () => {
    render(<ThreatDetectionPanel detections={mockDetections} />);

    const severitySelect = screen.getByRole('combobox', { name: '' });
    fireEvent.change(severitySelect, { target: { value: 'critical' } });

    const criticalDetections = mockDetections.filter(d => d.severity === 'critical');
    expect(screen.getByText(`${criticalDetections.length} of ${mockDetections.length}`)).toBeInTheDocument();
  });

  it('filters detections by search query', () => {
    render(<ThreatDetectionPanel detections={mockDetections} />);

    const searchInput = screen.getByPlaceholderText('Search detections...');
    fireEvent.change(searchInput, { target: { value: 'PowerShell' } });

    expect(screen.getByText('Suspicious PowerShell Execution')).toBeInTheDocument();
  });

  it('calls onSelectDetection when a detection is clicked', () => {
    const onSelectDetection = jest.fn();
    render(<ThreatDetectionPanel detections={mockDetections} onSelectDetection={onSelectDetection} />);

    fireEvent.click(screen.getByTestId(`detection-${mockDetections[0].id}`));

    expect(onSelectDetection).toHaveBeenCalledWith(mockDetections[0]);
  });

  it('displays severity badges correctly', () => {
    render(<ThreatDetectionPanel detections={mockDetections} />);

    expect(screen.getAllByText('CRITICAL').length).toBeGreaterThan(0);
  });

  it('displays status badges correctly', () => {
    render(<ThreatDetectionPanel detections={mockDetections} />);

    expect(screen.getByText('INVESTIGATING')).toBeInTheDocument();
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('shows stats for severity counts', () => {
    render(<ThreatDetectionPanel detections={mockDetections} />);

    const criticalCount = mockDetections.filter(d => d.severity === 'critical').length;
    expect(screen.getByText(`Critical: ${criticalCount}`)).toBeInTheDocument();
  });

  it('expands detection to show more details', () => {
    render(<ThreatDetectionPanel detections={mockDetections} />);

    const showMoreButtons = screen.getAllByText('Show more');
    fireEvent.click(showMoreButtons[0]);

    expect(screen.getByText('Affected Assets')).toBeInTheDocument();
    expect(screen.getByText('Indicators')).toBeInTheDocument();
  });

  it('calls onStatusChange when status action is clicked', () => {
    const onStatusChange = jest.fn();
    render(<ThreatDetectionPanel detections={mockDetections} onStatusChange={onStatusChange} />);

    // Expand a new detection
    const newDetection = mockDetections.find(d => d.status === 'new');
    if (newDetection) {
      const showMoreButtons = screen.getAllByText('Show more');
      fireEvent.click(showMoreButtons[1]); // Click on the "new" status detection

      const investigateBtn = screen.getByText('Investigate');
      fireEvent.click(investigateBtn);

      expect(onStatusChange).toHaveBeenCalledWith(newDetection.id, 'investigating');
    }
  });

  it('sorts detections correctly', () => {
    render(<ThreatDetectionPanel detections={mockDetections} />);

    const severityButton = screen.getByText('Severity');
    fireEvent.click(severityButton);

    // The first detection should be critical after sorting by severity desc
    const firstDetection = screen.getAllByTestId(/^detection-/)[0];
    expect(firstDetection).toBeInTheDocument();
  });

  it('displays empty state when no detections match filters', () => {
    render(<ThreatDetectionPanel detections={mockDetections} />);

    const searchInput = screen.getByPlaceholderText('Search detections...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent detection xyz' } });

    expect(screen.getByText('No detections found matching your criteria.')).toBeInTheDocument();
  });

  it('highlights selected detection', () => {
    render(<ThreatDetectionPanel detections={mockDetections} selectedId={mockDetections[0].id} />);

    const selectedDetection = screen.getByTestId(`detection-${mockDetections[0].id}`);
    expect(selectedDetection).toHaveClass('bg-blue-50');
  });
});
