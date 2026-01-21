import React from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Navigation } from './Navigation'
import { GlobalSearch } from './GlobalSearch'
import { useAuth } from '@/contexts/AuthContext'
import { useSearch } from '@/contexts/SearchContext'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { SnapshotMenu } from '@/features/snapshots'
import { GlobalStatusBanner } from '@/features/internal-command/components/GlobalStatusBanner'
import { Search } from 'lucide-react'

export function Layout() {
  const { user, loading, isAuthenticated } = useAuth()
  const { openSearch } = useSearch()

  if (loading) {
    return (
      <div className="h-screen flex">
        <div className="w-64 bg-muted">
          <Skeleton className="h-full" />
        </div>
        <div className="flex-1 p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  return (
    <div className="h-screen flex bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-0 focus:left-0 focus:p-4 focus:bg-background focus:text-primary focus:border focus:border-primary focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Sidebar Navigation */}
      <Navigation user={user} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-6">
            <div className="flex-1">
              <h1 className="text-lg font-semibold">IntelGraph Platform</h1>
            </div>

            {/* Search trigger - actual search modal is rendered globally */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
                onClick={openSearch}
                aria-label="Search (Cmd+K)"
              >
                <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                <span className="hidden lg:inline-flex">Search platform...</span>
                <span className="inline-flex lg:hidden">Search...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
              <SnapshotMenu />
              <div className="text-sm text-muted-foreground">
                Welcome back, {user?.name}
              </div>
            </div>
          </div>
        </header>

        <GlobalStatusBanner />

        {/* Page Content */}
        <main id="main-content" className="flex-1 overflow-auto" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch />
    </div>
  )
}
