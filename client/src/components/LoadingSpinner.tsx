import React from 'react';

/**
 * Props for the LoadingSpinner component.
 */
interface LoadingSpinnerProps {
  /** Size of the spinner ('sm', 'md', 'lg'). Defaults to 'md'. */
  size?: 'sm' | 'md' | 'lg';
  /** Optional message to display below the spinner. Defaults to 'Loading...'. */
  message?: string;
  /** Additional CSS classes to apply to the container. */
  className?: string;
}

/**
 * A simple loading spinner component with optional message and size control.
 *
 * @param props - The component props.
 * @returns The rendered LoadingSpinner component.
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message = 'Loading...',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-4 ${className}`}
    >
      <div
        className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}
      ></div>
      {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
