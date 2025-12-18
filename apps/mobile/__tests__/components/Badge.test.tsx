import React from 'react';
import { render } from '@testing-library/react-native';
import { Badge, PriorityBadge, ClassificationBadge, EntityTypeBadge } from '../../src/components/ui/Badge';

describe('Badge', () => {
  it('renders correctly with text', () => {
    const { getByText } = render(<Badge>Test Badge</Badge>);
    expect(getByText('Test Badge')).toBeTruthy();
  });

  it('applies variant styles', () => {
    const { getByText, rerender } = render(
      <Badge variant="primary">Primary</Badge>
    );
    expect(getByText('Primary')).toBeTruthy();

    rerender(<Badge variant="destructive">Destructive</Badge>);
    expect(getByText('Destructive')).toBeTruthy();

    rerender(<Badge variant="success">Success</Badge>);
    expect(getByText('Success')).toBeTruthy();
  });

  it('applies size styles', () => {
    const { getByText, rerender } = render(<Badge size="sm">Small</Badge>);
    expect(getByText('Small')).toBeTruthy();

    rerender(<Badge size="lg">Large</Badge>);
    expect(getByText('Large')).toBeTruthy();
  });
});

describe('PriorityBadge', () => {
  it('renders CRITICAL priority', () => {
    const { getByText } = render(<PriorityBadge priority="CRITICAL" />);
    expect(getByText('CRITICAL')).toBeTruthy();
  });

  it('renders HIGH priority', () => {
    const { getByText } = render(<PriorityBadge priority="HIGH" />);
    expect(getByText('HIGH')).toBeTruthy();
  });

  it('renders all priority levels', () => {
    const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
    priorities.forEach((priority) => {
      const { getByText } = render(<PriorityBadge priority={priority} />);
      expect(getByText(priority)).toBeTruthy();
    });
  });
});

describe('ClassificationBadge', () => {
  it('renders UNCLASSIFIED', () => {
    const { getByText } = render(
      <ClassificationBadge classification="UNCLASSIFIED" />
    );
    expect(getByText('UNCLASSIFIED')).toBeTruthy();
  });

  it('renders TOP_SECRET with space', () => {
    const { getByText } = render(
      <ClassificationBadge classification="TOP_SECRET" />
    );
    expect(getByText('TOP SECRET')).toBeTruthy();
  });
});

describe('EntityTypeBadge', () => {
  it('renders PERSON entity type', () => {
    const { getByText } = render(<EntityTypeBadge type="PERSON" />);
    expect(getByText('PERSON')).toBeTruthy();
  });

  it('renders all entity types', () => {
    const types = [
      'PERSON',
      'ORGANIZATION',
      'LOCATION',
      'EVENT',
      'DOCUMENT',
      'THREAT',
    ] as const;
    types.forEach((type) => {
      const { getByText } = render(<EntityTypeBadge type={type} />);
      expect(getByText(type)).toBeTruthy();
    });
  });
});
