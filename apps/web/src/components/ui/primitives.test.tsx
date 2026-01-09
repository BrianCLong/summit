import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Alert, AlertDescription, AlertTitle } from './Alert';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';
import { EmptyState } from './EmptyState';

expect.extend(toHaveNoViolations);

describe('Primitive components', () => {
  it('renders alert variants accessibly', async () => {
    const { container } = render(
      <div>
        <Alert>
          <AlertTitle>Default</AlertTitle>
          <AlertDescription>Default message</AlertDescription>
        </Alert>
        <Alert variant="success">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Success message</AlertDescription>
        </Alert>
        <Alert variant="info">
          <AlertTitle>Info</AlertTitle>
          <AlertDescription>Info message</AlertDescription>
        </Alert>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders card anatomy with title and description', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
          <CardDescription>Connectors status</CardDescription>
        </CardHeader>
        <CardContent>Body content</CardContent>
      </Card>
    );

    expect(screen.getByText('Data Sources')).toBeDefined();
    expect(screen.getByText('Connectors status')).toBeDefined();
    expect(screen.getByText('Body content')).toBeDefined();
  });

  it('renders empty state actions', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        title="No signals"
        description="Connect a source to begin."
        action={{ label: 'Add source', onClick: handleClick }}
      />
    );

    const button = screen.getByRole('button', { name: 'Add source' });
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders badge variants and button sizes', () => {
    render(
      <div>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
      </div>
    );

    expect(screen.getByText('Success')).toBeDefined();
    expect(screen.getByText('Warning')).toBeDefined();
    expect(screen.getByText('Small')).toBeDefined();
    expect(screen.getByText('Large')).toBeDefined();
  });
});
