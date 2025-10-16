import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

type StepNode = { id: string; label: string; children?: StepNode[] };

function Tree({ node, depth = 0 }: { node: StepNode; depth?: number }) {
  return (
    <Box
      sx={{
        ml: depth * 2,
        borderLeft: depth ? '1px solid rgba(0,0,0,0.1)' : 'none',
        pl: 1,
        mb: 0.5,
      }}
    >
      <Typography variant="body2">• {node.label}</Typography>
      {node.children?.map((c) => (
        <Tree key={c.id} node={c} depth={depth + 1} />
      ))}
    </Box>
  );
}

export function ProvenanceTree({ root }: { root?: StepNode }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Evidence & Provenance
        </Typography>
        {root ? (
          <Tree node={root} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            No provenance manifest yet. Run a runbook or import a manifest to
            view source→transform→claim chain.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
