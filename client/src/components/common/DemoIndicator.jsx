import React from 'react';
import { Box } from '@mui/material';

const DemoIndicator = () => {
  // Check if demo mode is enabled via environment variable
  // In Vite, environment variables must be prefixed with VITE_
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === '1';

  // Only show if in demo mode
  if (!isDemoMode) {
    return null;
  }

  // Position: top right ribbon
  const topRibbonStyle = {
    position: 'fixed',
    top: '10px',
    right: '10px',
    zIndex: 9999,
    background: 'linear-gradient(45deg, #ff4136, #e52e2e)',
    color: 'white',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    borderRadius: '4px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
    pointerEvents: 'none', // So it doesn't interfere with clicks
  };

  // Position: footer watermark
  const footerStyle = {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    zIndex: 9998,
    background: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    opacity: 0.8,
  };

  return (
    <>
      {/* Top-right ribbon indicator */}
      <Box sx={topRibbonStyle}>
        DEMO MODE
      </Box>

      {/* Footer watermark */}
      <Box sx={footerStyle}>
        Demo data • Not production
      </Box>
    </>
  );
};

export default DemoIndicator;