import React from 'react'
import { Skeleton } from './Skeleton'
import { EmptyState } from './EmptyState'
import { RetryableErrorState } from './RetryableErrorState'

export interface DataStateWrapperProps {
  children: React.ReactNode
  isLoading: boolean
  isError: boolean
  error?: Error | string
  isEmpty?: boolean
  onRetry?: () => void
  onNavigateHome?: () => void
  loadingComponent?: React.ReactNode
  emptyStateProps?: {
    icon?: 'search' | 'file' | 'alert' | 'plus' | React.ReactNode
    title: string
    description?: string
    action?: {
      label: string
      onClick: () => void
      variant?: 'default' | 'outline'
    }
  }
  errorStateProps?: {
    title?: string
    description?: string
    showDetails?: boolean
  }
}

/**
 * DataStateWrapper - The "State Triplet" component
 *
 * Standardizes the pattern of handling:
 * 1. Loading state (skeleton)
 * 2. Error state (with retry)
 * 3. Empty state (with primary CTA)
 * 4. Success state (render children)
 *
 * Usage:
 * ```tsx
 * <DataStateWrapper
 *   isLoading={loading}
 *   isError={error}
 *   isEmpty={data.length === 0}
 *   onRetry={() => refetch()}
 *   emptyStateProps={{
 *     title: "No items found",
 *     description: "Get started by creating a new item",
 *     action: { label: "Create Item", onClick: () => create() }
 *   }}
 * >
 *   {data.map(item => <ItemCard key={item.id} {...item} />)}
 * </DataStateWrapper>
 * ```
 */
export function DataStateWrapper({
  children,
  isLoading,
  isError,
  error,
  isEmpty = false,
  onRetry,
  onNavigateHome,
  loadingComponent,
  emptyStateProps,
  errorStateProps,
}: DataStateWrapperProps) {
  // Priority order: Error > Loading > Empty > Success

  if (isError) {
    return (
      <RetryableErrorState
        error={error}
        onRetry={onRetry}
        onNavigateHome={onNavigateHome}
        title={errorStateProps?.title}
        description={errorStateProps?.description}
        showDetails={errorStateProps?.showDetails}
      />
    )
  }

  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>
    }

    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isEmpty && emptyStateProps) {
    return <EmptyState {...emptyStateProps} />
  }

  return <>{children}</>
}
