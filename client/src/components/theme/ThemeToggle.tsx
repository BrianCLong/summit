import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { DarkMode, LightMode } from '@mui/icons-material';
import { useThemeContext } from '../../theme/ThemeProvider';

const ThemeToggle = () => {
  const { mode, toggleTheme, loading } = useThemeContext();
  const isDark = mode === 'dark';

  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <span>
        <IconButton
          color="inherit"
          aria-label="Toggle theme"
          onClick={toggleTheme}
          disabled={loading}
          size="large"
          className="transition-colors hover:bg-primary/10"
        >
          {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default ThemeToggle;
