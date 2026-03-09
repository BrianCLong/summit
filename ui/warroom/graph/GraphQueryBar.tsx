/**
 * Summit War Room — Graph Query Bar
 *
 * Inline Cypher query bar for the graph canvas.
 * Supports query history and quick-search.
 */

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HistoryIcon from '@mui/icons-material/History';
import { useWarRoomStore } from '../store';

export const GraphQueryBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const addGraphQuery = useWarRoomStore((s) => s.addGraphQuery);
  const graphQueries = useWarRoomStore((s) => s.graphQueries);
  const [showHistory, setShowHistory] = useState(false);

  const handleRun = () => {
    if (!query.trim()) return;
    addGraphQuery({
      id: `gq-${Date.now()}`,
      cypher: query.trim(),
      label: query.trim().slice(0, 60),
      createdAt: new Date().toISOString(),
    });
    // Query execution would be dispatched to the backend here
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.5, gap: 0.5 }}>
        <InputBase
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRun()}
          placeholder="MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 100"
          sx={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
          fullWidth
        />
        <Tooltip title="Run query">
          <IconButton size="small" color="primary" onClick={handleRun} disabled={!query.trim()}>
            <PlayArrowIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Query history">
          <IconButton size="small" onClick={() => setShowHistory(!showHistory)}>
            <HistoryIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {showHistory && graphQueries.length > 0 && (
        <Box sx={{ px: 1, pb: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {graphQueries.slice(-5).map((q) => (
            <Chip
              key={q.id}
              label={q.label}
              size="small"
              onClick={() => setQuery(q.cypher)}
              sx={{ fontSize: 10, maxWidth: 200 }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
