import React, { FC, useCallback, useState, useMemo } from 'react';
import {
  Box,
  Button,
  List,
  ListItemButton,
  Typography,
  Select,
  MenuItem,
} from '@mui/material';
import type { WhyPath } from '../graph/overlays/WhyPathsOverlay';

interface Props {
  paths: WhyPath[];
  onSelect?: (path: WhyPath) => void;
  onStrategyChange?: (strategy: string) => void;
}

/**
 * ExplainabilityPanel renders a list of why_paths and exposes copy/export actions.
 * The list is keyboard accessible with ARIA roles.
 */
const ExplainabilityPanel: FC<Props> = ({
  paths,
  onSelect,
  onStrategyChange,
}) => {
  const [index, setIndex] = useState(0);
  const [strategy, setStrategy] = useState('v2');

  const humanText = useCallback(
    () => paths.map((p) => `${p.from} → ${p.to} (${p.relId})`).join('\n'),
    [paths],
  );

  const copy = useCallback(async () => {
    const payload = JSON.stringify(
      { why_paths: paths, text: humanText() },
      null,
      2,
    );
    await navigator.clipboard.writeText(payload);
  }, [paths, humanText]);

  const exportJson = useCallback(() => {
    const payload = JSON.stringify(
      { why_paths: paths, text: humanText() },
      null,
      2,
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'why_paths.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [paths, humanText]);

  const handleKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'ArrowDown') {
      setIndex((i) => Math.min(i + 1, paths.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setIndex((i) => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      onSelect?.(paths[index]);
    }
  };

  const sorted = useMemo(() => {
    if (strategy === 'v2') {
      return [...paths].sort(
        (a, b) => (b.supportScore || 0) - (a.supportScore || 0),
      );
    }
    return paths;
  }, [paths, strategy]);

  const changeStrategy = (s: string) => {
    setStrategy(s);
    onStrategyChange?.(s);
  };

  return (
    <Box aria-label="Explainability paths" role="region">
      <Box display="flex" gap={1} mb={1}>
        <Button size="small" onClick={copy} aria-label="Copy why paths">
          Copy
        </Button>
        <Button size="small" onClick={exportJson} aria-label="Export why paths">
          Export
        </Button>
        <Select
          size="small"
          value={strategy}
          onChange={(e) => changeStrategy(e.target.value)}
          aria-label="Ranking strategy"
        >
          <MenuItem value="v1">v1</MenuItem>
          <MenuItem value="v2">v2</MenuItem>
        </Select>
      </Box>
      <List
        role="listbox"
        tabIndex={0}
        aria-activedescendant={sorted[index]?.relId}
        onKeyDown={handleKey}
        sx={{ maxHeight: 200, overflow: 'auto' }}
      >
        {sorted.map((p, i) => (
          <ListItemButton
            key={p.relId}
            id={p.relId}
            role="option"
            selected={i === index}
            onClick={() => onSelect?.(p)}
            component="li"
            sx={{ cursor: 'pointer' }}
          >
            <Typography variant="body2">
              {p.from} → {p.to}
            </Typography>
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default ExplainabilityPanel;
