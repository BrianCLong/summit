import React from 'react';
import { Button as MuiButton, IconButton as MuiIconButton } from '@mui/material';
import { colors, spacing } from '../design-tokens';
import { useAccessibility } from '../accessibility/AccessibilityContext';

export const Button = ({ 
  variant = 'contained', 
  color = 'primary', 
  size = 'medium', 
  children, 
  'aria-label': ariaLabel,
  ...props 
}) => {
  const { keyboardNavigation } = useAccessibility();
  
  // Add keyboard navigation class if needed
  const buttonProps = {
    variant,
    color,
    size,
    ...props
  };

  if (keyboardNavigation) {
    buttonProps.className = `${props.className || ''} summit-focus-visible`;
  }

  return (
    <MuiButton 
      {...buttonProps}
    >
      {children}
    </MuiButton>
  );
};

export const IconButton = ({ children, 'aria-label': ariaLabel, ...props }) => {
  const { keyboardNavigation } = useAccessibility();
  
  // Ensure icon buttons have proper screen reader labels
  const iconProps = { ...props };
  
  if (keyboardNavigation) {
    iconProps.className = `${props.className || ''} summit-focus-visible`;
  }

  return (
    <MuiIconButton 
      aria-label={ariaLabel}
      {...iconProps}
    >
      {children}
    </MuiIconButton>
  );
};