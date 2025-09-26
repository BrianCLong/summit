import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { NlqModal } from './NlqModal.js';
import { RUN_NL_GRAPH_SEARCH } from '../../graphql/nlq.gql.js';

describe('NlqModal', () => {
  it('runs a graph search and renders results', async () => {
    const mocks = [
      {
        request: {
          query: RUN_NL_GRAPH_SEARCH,
          variables: {
            input: {
              prompt: 'Show people',
              tenantId: 'default',
              limit: 25,
            },
          },
        },
        result: {
          data: {
            naturalLanguageGraphSearch: {
              cypher: 'MATCH (node:Person) RETURN node LIMIT $limit',
              graphql: null,
              params: { tenantId: 'default', limit: 25 },
              warnings: [],
              rows: [{ node: { id: '1', labels: ['Person'], properties: { name: 'Alice' } } }],
            },
          },
        },
      },
    ];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <NlqModal />
      </MockedProvider>,
    );

    fireEvent.change(screen.getByLabelText('nl-input'), {
      target: { value: 'Show people!!!' },
    });

    fireEvent.click(screen.getByText('Run Graph Search'));

    await waitFor(() => expect(screen.getByLabelText('cypher-output')).toBeInTheDocument());
    expect(screen.getByLabelText('cypher-output')).toHaveTextContent('MATCH (node:Person)');

    await waitFor(() => expect(screen.getByLabelText('graph-results')).toBeInTheDocument());
    expect(screen.getByLabelText('graph-results')).toHaveTextContent('Alice');
  });
});
