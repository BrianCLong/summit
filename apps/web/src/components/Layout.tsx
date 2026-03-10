import React from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Navigation } from './Navigation'
import { GlobalSearch } from './GlobalSearch'
import { useAuth } from '@/contexts/AuthContext'
import { Skeleton } from '@/components/ui/Skeleton'
import { SnapshotMenu } from '@/features/snapshots'
import { GlobalStatusBanner } from '@/features/internal-command/components/GlobalStatusBanner'
import { cn } from '@/lib/utils'
import { Bell, ChevronDown } from 'lucide-react'

function LoadingSkeleton() {
  return (
    <div
      className="h-screen flex"
      style={{ background: 'var(--surface-base)' }}
    >
      {/* Sidebar skeleton */}
      <div
        className="w-[220px] border-r flex flex-col"
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="h-[52px] border-b px-4 flex items-center gap-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="w-7 h-7 rounded-md skeleton-shimmer" />
          <div className="flex-1">
            <div className="h-3 w-16 rounded skeleton-shimmer mb-1" />
            <div className="h-2 w-12 rounded skeleton-shimmer" />
          </div>
        </div>
        <div className="p-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="h-7 w-full rounded-md skeleton-shimmer" />
        </div>
        <div className="flex-1 p-3 space-y-1">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-8 w-full rounded-md skeleton-shimmer" />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        <div
          className="h-[52px] border-b px-6 flex items-center"
          style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex-1">
            <div className="h-4 w-48 rounded skeleton-shimmer" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md skeleton-shimmer" />
            <div className="h-7 w-28 rounded-md skeleton-shimmer" />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-4">
          <div className="h-8 w-64 rounded skeleton-shimmer" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-lg skeleton-shimmer" />
            ))}
          </div>
          <div className="h-64 w-full rounded-lg skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}

export function Layout() {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return <LoadingSkeleton />
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ background: 'var(--surface-base)' }}
    >
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className={cn(
          'sr-only focus:not-sr-only',
          'focus:absolute focus:z-[9999] focus:top-3 focus:left-3',
          'focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-medium',
          'focus:text-[var(--text-primary)] focus:bg-[var(--surface-highest)]',
          'focus:border focus:border-[var(--border-accent)]',
          'focus:shadow-lg focus:outline-none'
        )}
      >
        Skip to main content
      </a>

      {/* ── Sidebar ──────────────────────────────────────── */}
      <Navigation user={user} />

      {/* ── Main Shell ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* ── Header ─────────────────────────────────────── */}
        <header
          className="shrink-0 flex items-center h-[52px] px-5 border-b z-[var(--ds-z-navigation)]"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* Breadcrumb / Context */}
          <div className="flex-1 min-w-0">
            <div
              className="text-[13px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]"
            >
              IntelGraph Platform
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2">
            <SnapshotMenu />

            {/* Notification bell */}
            <button
              className={cn(
                'relative w-8 h-8 flex items-center justify-center rounded-md',
                'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
                'hover:bg-[var(--surface-overlay)] transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-600)]'
              )}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {/* Unread dot */}
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--severity-critical-solid)' }}
                aria-hidden="true"
              />
            </button>

            {/* User pill */}
            <div
              className={cn(
                'flex items-center gap-2 pl-2 pr-2.5 h-8 rounded-md',
                'border border-[var(--border-subtle)]',
                'hover:border-[var(--border-default)] hover:bg-[var(--surface-overlay)]',
                'transition-all duration-150 cursor-default'
              )}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--accent-700) 0%, var(--accent-500) 100%)' }}
              >
                <span className="text-[9px] font-semibold text-white">
                  {user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-[12px] font-medium text-[var(--text-secondary)] max-w-[120px] truncate">
                {user?.name?.split(' ')[0] || 'User'}
              </span>
            </div>
          </div>
        </header>

        {/* ── Status Banner ───────────────────────────────── */}
        <GlobalStatusBanner />

        {/* ── Page Content ────────────────────────────────── */}
        <main
          id="main-content"
          className="flex-1 overflow-auto scrollbar-thin"
          tabIndex={-1}
          style={{ background: 'var(--surface-base)' }}
        >
          <Outlet />
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch />
    </div>
  )
}
