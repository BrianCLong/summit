import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

const variantClasses: Record<string, string> = {
  default: 'bg-bg-surface border border-border-default',
  elevated: 'bg-bg-elevated border border-border-default shadow-md',
  outlined: 'bg-transparent border border-border-strong',
  interactive: 'bg-bg-surface border border-border-default hover:border-brand-primary/40 hover:shadow-glow cursor-pointer transition-all duration-normal',
};

const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({ variant = 'default', padding = 'md', header, footer, children, className = '', ...props }) => {
  return (
    <div className={`rounded-lg ${variantClasses[variant]} ${className}`} {...props}>
      {header && <div className="px-4 py-3 border-b border-border-default">{header}</div>}
      <div className={paddingClasses[padding]}>{children}</div>
      {footer && <div className="px-4 py-3 border-t border-border-default">{footer}</div>}
    </div>
  );
};
