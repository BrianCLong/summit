import React from 'react';
import { gql, useLazyQuery } from '@apollo/client';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemButton,
  Divider,
} from '@mui/material';
import $ from 'jquery';

const Q = gql`
  query ($input: GraphRAGQueryInput!) {
    graphRagAnswer(input: $input) {
      answer
      confidence
      citations {
        entityIds
      }
      why_paths {
        from
        to
        relId
        type
        supportScore
        score_breakdown {
          length
          edgeType
          centrality
        }
      }
    }
  }
`;

export default function AIExplainPanel({ cy, investigationId }) {
  const [q, setQ] = React.useState('What links A and B?');
  const [strategy, setStrategy] = React.useState('v2');
  const [run, { data, loading, error }] = useLazyQuery(Q, {
    fetchPolicy: 'network-only',
  });

  React.useEffect(() => {
    if (!cy) return;
    cy.style()
      .selector('edge.why')
      .style({ width: 6, 'line-style': 'solid' })
      .update();
  }, [cy]);

  React.useEffect(() => {
    if (!cy || !data?.graphRagAnswer) return;
    const ids = data.graphRagAnswer.why_paths.map((w) => w.relId);
    cy.batch(() => {
      cy.elements('edge').removeClass('why');
      ids.forEach((id) => cy.$(`edge[id = "${id}"]`).addClass('why'));
    });
    $(cy.container()).trigger('intelgraph:why_paths_applied', [ids]);
  }, [cy, data]);

  return (
    <Paper className="p-3">
      <Typography variant="subtitle2">Copilot</Typography>
      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ width: '100%' }}
      />
      <select
        value={strategy}
        onChange={(e) => setStrategy(e.target.value)}
        data-testid="ranking-strategy"
      >
        <option value="v1">v1</option>
        <option value="v2">v2</option>
      </select>
      <Button
        disabled={loading}
        onClick={() =>
          run({
            variables: {
              input: {
                investigationId,
                question: q,
                rankingStrategy: strategy,
              },
            },
          })
        }
      >
        Ask
      </Button>
      {error && <Typography color="error">{String(error.message)}</Typography>}
      {data && (
        <Box mt={2}>
          <Typography variant="body1">{data.graphRagAnswer.answer}</Typography>
          <Typography variant="caption">
            Confidence: {(data.graphRagAnswer.confidence * 100).toFixed(0)}%
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption">Citations</Typography>
          <List dense>
            {data.graphRagAnswer.citations.entityIds.map((id) => (
              <ListItem key={id} disablePadding>
                <ListItemButton
                  onClick={() => {
                    const node = cy.$(`node[id = "${id}"]`);
                    if (node.nonempty()) {
                      cy.animate({ center: { eles: node }, duration: 200 });
                      node.flashClass && node.flashClass('highlight', 1000);
                    }
                  }}
                >
                  {id}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Paper>
  );
}
