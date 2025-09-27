import React from 'react';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';

function IntelGraphButton({ children, ...props }) {
  const theme = useTheme();

  return (
    <Button
      variant="contained"
      sx={{
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText || '#FFFFFF',
        '&:hover': {
          backgroundColor: theme.palette.primary.light,
        },
        borderRadius: theme.shape.borderRadius,
        fontWeight: theme.typography.button.fontWeight,
        fontSize: theme.typography.button.fontSize,
        lineHeight: theme.typography.button.lineHeight,
        textTransform: theme.typography.button.textTransform,
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

export default IntelGraphButton;
