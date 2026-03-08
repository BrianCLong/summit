import React from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  className?: string;
};

export function PageHeader({
  title,
  description,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={className}>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
        {title}
      </h1>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  );
}
