import React from 'react';

import { cn } from '@/lib/utils';

type ChildrenProps = {
  children: React.ReactNode;
};

type ContextMenuContentProps = ChildrenProps & {
  className?: string;
};

type ContextMenuItemProps = ChildrenProps & {
  className?: string;
  onSelect?: () => void;
};

export function ContextMenu({ children }: ChildrenProps) {
  return <>{children}</>;
}

export function ContextMenuTrigger({ children }: ChildrenProps) {
  return <>{children}</>;
}

export function ContextMenuContent({
  children,
  className,
}: ContextMenuContentProps) {
  return (
    <div
      className={cn(
        'z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
}

export function ContextMenuItem({
  children,
  className,
  onSelect,
}: ContextMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground',
        className
      )}
    >
      {children}
    </button>
  );
}
