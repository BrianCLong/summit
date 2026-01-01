import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EvidenceBoard } from './EvidenceBoard';
import { AccessibilityProvider } from '../../design-system/src/accessibility/AccessibilityContext';

// Mock data for testing
const mockColumns = [
  { id: 'new', title: 'New Evidence', description: 'Recently discovered items', itemCount: 0, color: '#667eea' },
  { id: 'analyzing', title: 'In Analysis', description: 'Currently being examined', itemCount: 0, color: '#667eea' },
  { id: 'verified', title: 'Verified', description: 'Confirmed and validated', itemCount: 0, color: '#28a745' },
];

const mockItems = [
  {
    id: '1',
    title: 'Document Analysis',
    description: 'Analysis of the suspicious document found at the scene',
    tags: ['document', 'physical'],
    columnId: 'analyzing',
    createdAt: new Date(),
    updatedAt: new Date(),
    priority: 'high',
    source: 'Field Agent #123',
    confidence: 85,
    status: 'pending',
  },
  {
    id: '2',
    title: 'Digital Evidence',
    description: 'Digital artifacts recovered from the suspect device',
    tags: ['digital', 'corroborated'],
    columnId: 'new',
    createdAt: new Date(),
    updatedAt: new Date(),
    priority: 'critical',
    source: 'Digital Forensics',
    confidence: 90,
    status: 'pending',
  },
];

const mockTags = [
  { id: 'document', name: 'Document', color: '#17a2b8' },
  { id: 'digital', name: 'Digital', color: '#28a745' },
  { id: 'physical', name: 'Physical', color: '#fd7e14' },
  { id: 'corroborated', name: 'Corroborated', color: '#6f42c1' },
];

describe('EvidenceBoard', () => {
  const renderWithProvider = (ui: React.ReactElement, options?: any) =>
    render(
      <AccessibilityProvider>
        {ui}
      </AccessibilityProvider>,
      options
    );

  it('renders without crashing', () => {
    renderWithProvider(<EvidenceBoard />);
    expect(screen.getByText('Evidence Board')).toBeInTheDocument();
  });

  it('displays initial columns', () => {
    renderWithProvider(
      <EvidenceBoard 
        initialColumns={mockColumns}
        initialItems={mockItems}
        initialTags={mockTags}
      />
    );
    
    expect(screen.getByText('New Evidence')).toBeInTheDocument();
    expect(screen.getByText('In Analysis')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('displays initial items', () => {
    renderWithProvider(
      <EvidenceBoard 
        initialColumns={mockColumns}
        initialItems={mockItems}
        initialTags={mockTags}
      />
    );
    
    expect(screen.getByText('Document Analysis')).toBeInTheDocument();
    expect(screen.getByText('Digital Evidence')).toBeInTheDocument();
  });

  it('opens add evidence dialog when button is clicked', () => {
    renderWithProvider(<EvidenceBoard />);
    
    const addButton = screen.getByRole('button', { name: /add evidence/i });
    fireEvent.click(addButton);
    
    expect(screen.getByText('Add New Evidence')).toBeInTheDocument();
  });

  it('filters items based on search term', async () => {
    renderWithProvider(
      <EvidenceBoard 
        initialColumns={mockColumns}
        initialItems={mockItems}
        initialTags={mockTags}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search evidence...');
    fireEvent.change(searchInput, { target: { value: 'Document' } });
    
    await waitFor(() => {
      expect(screen.getByText('Document Analysis')).toBeInTheDocument();
      expect(screen.queryByText('Digital Evidence')).not.toBeInTheDocument();
    });
  });

  it('allows adding a new tag', async () => {
    renderWithProvider(<EvidenceBoard />);
    
    // Open the filter menu
    const filterButton = screen.getByLabelText('filter');
    fireEvent.click(filterButton);
    
    // Click "Add Tag"
    const addTagMenuItem = screen.getByText('Add Tag');
    fireEvent.click(addTagMenuItem);
    
    // Fill in the new tag form
    const tagNameInput = screen.getByLabelText('Tag Name');
    fireEvent.change(tagNameInput, { target: { value: 'New Tag' } });
    
    const addButton = screen.getByRole('button', { name: /add tag/i });
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Add New Tag')).not.toBeInTheDocument();
    });
  });
});