import React from 'react';
import { Alert, AlertTitle, Button, Box } from '@mui/material';
import { Refresh, Warning } from '@mui/icons-material';

interface ConflictBannerProps {
  visible: boolean;
  message?: string;
  onRefresh: () => void;
  onDismiss?: () => void;
}

export function ConflictBanner({ 
  visible, 
  message = "This content has been updated by another user. Your changes may conflict.", 
  onRefresh,
  onDismiss 
}: ConflictBannerProps) {
  if (!visible) return null;

  return (
    <Alert 
      severity="warning" 
      icon={<Warning />}
      sx={{ 
        mb: 2, 
        borderLeft: 3, 
        borderColor: 'warning.main',
        animation: 'slideDown 0.3s ease-out',
        '@keyframes slideDown': {
          from: { opacity: 0, transform: 'translateY(-20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        }
      }}
    >
      <AlertTitle>Content Conflict Detected</AlertTitle>
      {message}
      
      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
        <Button 
          size="small" 
          variant="outlined" 
          startIcon={<Refresh />}
          onClick={onRefresh}
        >
          Refresh Content
        </Button>
        
        {onDismiss && (
          <Button 
            size="small" 
            color="inherit" 
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        )}
      </Box>
    </Alert>
  );
}