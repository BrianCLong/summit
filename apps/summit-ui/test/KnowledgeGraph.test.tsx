import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KnowledgeGraph } from '../src/components/KnowledgeGraph';

describe('KnowledgeGraph Component', () => {
  const nodes = [
    { id: '1', group: 1 },
    { id: '2', group: 2 },
  ];
  const links = [
    { source: '1', target: '2', value: 1 },
  ];

  it('renders SVG container correctly', () => {
    const { container } = render(<KnowledgeGraph nodes={nodes} links={links} width={800} height={600} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '800');
    expect(svg).toHaveAttribute('height', '600');
    expect(svg).toHaveAttribute('viewBox', '0 0 800 600');
  });
});
