import React from 'react';
import { 
  CircularProgress, 
  LinearProgress, 
  Backdrop,
  Fade
} from '@mui/material';
import { prefersReducedMotion } from '../accessibility/accessibility-utils';

// Loading spinner with accessibility features
export const LoadingSpinner = ({ 
  size = 40, 
  thickness = 4, 
  disableAnimation = false, 
  ...props 
}) => {
  const shouldDisableAnimation = disableAnimation || prefersReducedMotion();

  return (
    <CircularProgress
      size={size}
      thickness={thickness}
      disableShrink={shouldDisableAnimation}
      {...props}
    />
  );
};

// Linear progress bar
export const ProgressBar = ({ 
  value, 
  variant = 'determinate', 
  disableAnimation = false, 
  ...props 
}) => {
  const shouldDisableAnimation = disableAnimation || prefersReducedMotion();

  return (
    <LinearProgress
      variant={variant}
      value={value}
      {...props}
      style={{
        transition: shouldDisableAnimation ? 'none' : undefined,
        ...props.style
      }}
    />
  );
};

// Full screen loading backdrop
export const LoadingBackdrop = ({ 
  open = false, 
  message = 'Loading...', 
  ...props 
}) => {
  return (
    <Backdrop
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={open}
      {...props}
    >
      <Fade in={open}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <LoadingSpinner />
          <div style={{ marginTop: '1rem' }}>{message}</div>
        </div>
      </Fade>
    </Backdrop>
  );
};

// Skeleton component for loading states
export const Skeleton = ({ 
  variant = 'rectangular', 
  width = '100%', 
  height = '1rem', 
  animation = true,
  ...props 
}) => {
  // For now, returning a simple div that mimics a skeleton
  // In a real implementation, we'd use a proper skeleton component
  const skeletonStyle = {
    backgroundColor: '#e0e0e0',
    borderRadius: variant === 'circular' ? '50%' : '4px',
    width,
    height,
    display: 'inline-block',
    animation: animation && !prefersReducedMotion() 
      ? 'pulse 1.5s ease-in-out infinite' 
      : 'none',
  };

  return <div style={skeletonStyle} {...props} />;
};

// Add CSS for the pulse animation
const style = document.createElement('style');
style.innerHTML = `
  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
    100% {
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);