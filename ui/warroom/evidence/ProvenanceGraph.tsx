/**
 * Summit War Room — Provenance Graph
 *
 * Visual provenance chain showing evidence lineage
 * as a directed acyclic graph.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import type { ProvenanceRecord } from '../types';

interface ProvenanceGraphProps {
  provenance: ProvenanceRecord[];
}

export const ProvenanceGraph: React.FC<ProvenanceGraphProps> = ({ provenance }) => {
  if (provenance.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No provenance data available.
        </Typography>
      </Box>
    );
  }

  // Render as a linear chain with connectors
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Provenance Graph
      </Typography>
      {provenance.map((record, idx) => (
        <Box key={record.id} sx={{ display: 'flex', gap: 1, mb: idx < provenance.length - 1 ? 0.5 : 0 }}>
          {/* Connector */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                border: 2,
                borderColor: 'background.paper',
              }}
            />
            {idx < provenance.length - 1 && <Box sx={{ width: 1, flex: 1, bgcolor: 'divider', minHeight: 20 }} />}
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, pb: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Typography variant="body2" fontWeight={600}>
                {record.action}
              </Typography>
              <Chip label={record.actor} size="small" sx={{ fontSize: 9, height: 18 }} />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {new Date(record.timestamp).toLocaleString()}
            </Typography>
            <Typography variant="body2">{record.details}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
};
