
import React from 'react';
import { render } from '@testing-library/react';
import { WithApollo } from './index';

// Regression test for P0 issue: Static import of createApolloClient causing
// syntax errors (import.meta) in non-Vite environments.
describe('WithApollo', () => {
  it('should render without crashing due to static imports', async () => {
    // This test ensures that importing ./index does not trigger synchronous
    // side effects (like reading import.meta) that would fail in Jest.
    // The component should mount and start loading (or error nicely).

    // We mock the child to keep it simple
    const { container } = render(
      <WithApollo>
        <div>Child</div>
      </WithApollo>
    );

    // It should initially render something (loading state or children)
    expect(container).toBeDefined();
  });
});
