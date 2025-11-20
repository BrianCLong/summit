import React from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Navigation } from './Navigation'
import { GlobalSearch } from './GlobalSearch'
import { useAuth } from '@/contexts/AuthContext'
import { Skeleton } from '@/components/ui/Skeleton'

export function Layout() {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex" role="status" aria-live="polite" aria-label="Loading application">
        <div className="w-64 bg-muted">
          <Skeleton className="h-full" aria-hidden="true" />
        </div>
        <div className="flex-1 p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" aria-hidden="true" />
            <Skeleton className="h-64 w-full" aria-hidden="true" />
            <Skeleton className="h-64 w-full" aria-hidden="true" />
          </div>
        </div>
        <span className="sr-only">Loading application content...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Skip Links for Keyboard Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-40 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
      >
        Skip to navigation
      </a>

      {/* Sidebar Navigation */}
      <Navigation user={user} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          role="banner"
        >
          <div className="flex h-14 items-center px-6">
            <div className="flex-1">
              <h1 className="text-lg font-semibold">IntelGraph Platform</h1>
            </div>

            {/* Search trigger - actual search modal is rendered globally */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground" aria-live="polite">
                Welcome back, {user?.name}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          id="main-content"
          className="flex-1 overflow-auto"
          role="main"
          aria-label="Main content"
        >
          <Outlet />
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch />
    </div>
  )
}
