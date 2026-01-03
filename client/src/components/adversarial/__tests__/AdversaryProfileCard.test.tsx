import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdversaryProfileCard } from '../AdversaryProfileCard';
import { mockAdversaries } from '../fixtures';

describe('AdversaryProfileCard', () => {
  const mockAdversary = mockAdversaries[0];

  it('renders adversary name and type', () => {
    render(<AdversaryProfileCard adversary={mockAdversary} />);

    expect(screen.getByText(mockAdversary.name)).toBeInTheDocument();
    expect(screen.getByText(/Nation State/i)).toBeInTheDocument();
  });

  it('renders threat level badge', () => {
    render(<AdversaryProfileCard adversary={mockAdversary} />);

    expect(screen.getByText(mockAdversary.threatLevel.toUpperCase())).toBeInTheDocument();
  });

  it('renders aliases', () => {
    render(<AdversaryProfileCard adversary={mockAdversary} />);

    mockAdversary.aliases.forEach(alias => {
      expect(screen.getByText(alias)).toBeInTheDocument();
    });
  });

  it('shows active status when adversary is active', () => {
    render(<AdversaryProfileCard adversary={mockAdversary} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders stats correctly', () => {
    render(<AdversaryProfileCard adversary={mockAdversary} />);

    // Use getAllByText since some numbers may appear multiple times
    expect(screen.getByText(mockAdversary.techniques.length.toString())).toBeInTheDocument();
    const malwareCount = screen.getAllByText(mockAdversary.malware.length.toString());
    expect(malwareCount.length).toBeGreaterThanOrEqual(1);
    const toolsCount = screen.getAllByText(mockAdversary.tools.length.toString());
    expect(toolsCount.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(mockAdversary.campaigns.length.toString())).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<AdversaryProfileCard adversary={mockAdversary} onSelect={onSelect} />);

    // Click on the header section which has the click handler
    const card = screen.getByTestId('adversary-card');
    const clickableArea = card.querySelector('[class*="cursor-pointer"]');
    if (clickableArea) {
      fireEvent.click(clickableArea);
    } else {
      fireEvent.click(card);
    }

    expect(onSelect).toHaveBeenCalledWith(mockAdversary);
  });

  it('calls onViewDetails when View Details button is clicked', () => {
    const onViewDetails = jest.fn();
    render(<AdversaryProfileCard adversary={mockAdversary} onViewDetails={onViewDetails} />);

    fireEvent.click(screen.getByText('View Details'));

    expect(onViewDetails).toHaveBeenCalledWith(mockAdversary);
  });

  it('calls onTrack when Track button is clicked', () => {
    const onTrack = jest.fn();
    render(<AdversaryProfileCard adversary={mockAdversary} onTrack={onTrack} />);

    fireEvent.click(screen.getByText('Track'));

    expect(onTrack).toHaveBeenCalledWith(mockAdversary);
  });

  it('expands to show more details when Show more is clicked', () => {
    render(<AdversaryProfileCard adversary={mockAdversary} />);

    fireEvent.click(screen.getByText('Show more'));

    expect(screen.getByText('Target Sectors')).toBeInTheDocument();
    expect(screen.getByText('Target Regions')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();
  });

  it('renders compact version correctly', () => {
    render(<AdversaryProfileCard adversary={mockAdversary} compact />);

    expect(screen.getByTestId('adversary-card-compact')).toBeInTheDocument();
    expect(screen.getByText(mockAdversary.name)).toBeInTheDocument();
  });

  it('applies selected styling when selected', () => {
    render(<AdversaryProfileCard adversary={mockAdversary} selected />);

    const card = screen.getByTestId('adversary-card');
    expect(card).toHaveClass('border-blue-500');
  });

  it('renders description', () => {
    render(<AdversaryProfileCard adversary={mockAdversary} />);

    expect(screen.getByText(mockAdversary.description)).toBeInTheDocument();
  });

  it('displays first and last seen dates when expanded', () => {
    render(<AdversaryProfileCard adversary={mockAdversary} />);

    fireEvent.click(screen.getByText('Show more'));

    expect(screen.getByText('First Seen:')).toBeInTheDocument();
    expect(screen.getByText('Last Seen:')).toBeInTheDocument();
  });

  it('displays tags when expanded', () => {
    render(<AdversaryProfileCard adversary={mockAdversary} />);

    fireEvent.click(screen.getByText('Show more'));

    mockAdversary.tags.forEach(tag => {
      expect(screen.getByText(`#${tag}`)).toBeInTheDocument();
    });
  });
});
