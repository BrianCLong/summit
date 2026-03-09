/**
 * Summit War Room — Scenario Tree
 *
 * Renders a branching scenario tree for simulation configuration.
 * Supports adding child scenarios, editing probability/impact,
 * and viewing outcomes.
 */

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { ScenarioNode } from '../types';

interface ScenarioTreeProps {
  root: ScenarioNode;
}

export const ScenarioTree: React.FC<ScenarioTreeProps> = ({ root }) => (
  <Box>
    <Typography variant="h6" sx={{ mb: 1 }}>
      Scenario Tree
    </Typography>
    <ScenarioNodeView node={root} depth={0} />
  </Box>
);

const ScenarioNodeView: React.FC<{ node: ScenarioNode; depth: number }> = ({ node, depth }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <Box sx={{ ml: depth * 2, mb: 0.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          p: 0.75,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
        }}
      >
        {hasChildren && (
          <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ p: 0.25 }}>
            {expanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        )}
        {!hasChildren && <Box sx={{ width: 24 }} />}

        <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
          {node.title}
        </Typography>
        <Chip label={`P: ${(node.probability * 100).toFixed(0)}%`} size="small" sx={{ fontSize: 9, height: 18 }} />
        <Chip
          label={`Impact: ${node.impact}`}
          size="small"
          variant="outlined"
          sx={{ fontSize: 9, height: 18 }}
          color={node.impact > 7 ? 'error' : node.impact > 4 ? 'warning' : 'default'}
        />
        <Tooltip title="Add child scenario">
          <IconButton size="small" sx={{ p: 0.25 }}>
            <AddIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {node.description && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: hasChildren ? 3.5 : 3.5, display: 'block' }}>
          {node.description}
        </Typography>
      )}

      {node.outcomes.length > 0 && (
        <Box sx={{ ml: 3.5, mt: 0.25 }}>
          {node.outcomes.map((outcome) => (
            <Chip
              key={outcome.id}
              label={outcome.label}
              size="small"
              variant="outlined"
              color="info"
              sx={{ mr: 0.5, fontSize: 9, height: 18 }}
            />
          ))}
        </Box>
      )}

      <Collapse in={expanded}>
        {node.children.map((child) => (
          <ScenarioNodeView key={child.id} node={child} depth={depth + 1} />
        ))}
      </Collapse>
    </Box>
  );
};
