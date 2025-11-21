/**
 * Error Boundary for Tri-Pane Components
 *
 * Catches rendering errors in child components and displays
 * a fallback UI instead of crashing the entire application.
 */

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  paneName?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class TriPaneErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('TriPane Error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          className="flex flex-col items-center justify-center h-full p-6 bg-destructive/5 rounded-lg"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {this.props.paneName
              ? `${this.props.paneName} Error`
              : 'Something went wrong'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
