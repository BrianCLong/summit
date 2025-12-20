import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    this.setState({ error, errorInfo })
    // Log to monitoring service (e.g. Sentry/OpenTelemetry)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  private handleHome = () => {
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="mb-8 max-w-md text-muted-foreground">
            We encountered an unexpected error. Our team has been notified.
            Please try refreshing the page.
          </p>

          <div className="flex gap-4">
            <Button variant="outline" onClick={this.handleHome}>
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
            <Button onClick={this.handleRetry}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-8 max-h-64 w-full max-w-2xl overflow-auto rounded-md bg-slate-950 p-4 text-left font-mono text-xs text-slate-50">
              <p className="font-bold text-red-400">{this.state.error.toString()}</p>
              <pre className="mt-2">{this.state.errorInfo?.componentStack}</pre>
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
