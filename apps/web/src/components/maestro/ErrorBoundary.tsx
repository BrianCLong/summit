import React, { Component, ErrorInfo, ReactNode } from 'react'
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  BugAntIcon,
} from '@heroicons/react/24/outline'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  enableRetry?: boolean
  maxRetries?: number
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
  isRetrying: boolean
}

export class MaestroErrorBoundary extends Component<Props, State> {
  private retryTimeouts: NodeJS.Timeout[] = []

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Maestro Error Boundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Report to monitoring service
    this.reportError(error, errorInfo)
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(clearTimeout)
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      await fetch('/api/maestro/v1/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          errorInfo,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (reportError) {
      console.error('Failed to report error:', reportError)
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount >= (this.props.maxRetries || 3)) {
      return
    }

    this.setState({
      isRetrying: true,
      retryCount: this.state.retryCount + 1,
    })

    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, this.state.retryCount) * 1000

    const timeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
      })
    }, delay)

    this.retryTimeouts.push(timeout)
  }

  private copyErrorToClipboard = () => {
    const { error, errorInfo } = this.state
    const errorText = `
Error: ${error?.name || 'Unknown'} - ${error?.message || 'No message'}

Stack Trace:
${error?.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}

Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim()

    navigator.clipboard.writeText(errorText).then(() => {
      // Could show a toast notification here
      console.log('Error details copied to clipboard')
    })
  }

  render() {
    if (this.state.hasError) {
      // Show custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <BugAntIcon className="h-8 w-8 text-red-600" />
              </div>

              <h1 className="text-2xl font-semibold text-gray-900 mb-4">
                Something went wrong
              </h1>

              <p className="text-gray-600 mb-6">
                The Maestro interface encountered an unexpected error. Our team
                has been notified and is working on a fix.
              </p>

              {/* Error details (collapsible) */}
              <details className="text-left bg-gray-50 rounded-lg p-4 mb-6">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Error Details
                </summary>
                <div className="text-xs font-mono text-gray-600 space-y-2">
                  <div>
                    <strong>Error:</strong>{' '}
                    {this.state.error?.name || 'Unknown'}
                  </div>
                  <div>
                    <strong>Message:</strong>{' '}
                    {this.state.error?.message || 'No message'}
                  </div>
                  {this.state.error?.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap text-xs mt-1 p-2 bg-white rounded border">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>

              {/* Action buttons */}
              <div className="space-y-3">
                {this.props.enableRetry !== false && (
                  <button
                    onClick={this.handleRetry}
                    disabled={
                      this.state.isRetrying ||
                      this.state.retryCount >= (this.props.maxRetries || 3)
                    }
                    className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
                      this.state.isRetrying ||
                      this.state.retryCount >= (this.props.maxRetries || 3)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {this.state.isRetrying ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                        Retrying... ({this.state.retryCount}/
                        {this.props.maxRetries || 3})
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                        Try Again ({this.state.retryCount}/
                        {this.props.maxRetries || 3})
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={this.copyErrorToClipboard}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
                  Copy Error Details
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Refresh Page
                </button>

                <a
                  href="/maestro"
                  className="w-full flex items-center justify-center px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors text-sm"
                >
                  Return to Dashboard
                </a>
              </div>

              {/* Support info */}
              <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
                Error ID: {this.state.error?.stack?.slice(0, 8) || 'unknown'}
                <br />
                Time: {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Specialized error boundary for specific Maestro components
export function withMaestroErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  options: {
    fallback?: ReactNode
    enableRetry?: boolean
    maxRetries?: number
  } = {}
) {
  return function WrappedComponent(props: T) {
    return (
      <MaestroErrorBoundary {...options}>
        <Component {...props} />
      </MaestroErrorBoundary>
    )
  }
}

// Hook for programmatic error reporting
export function useMaestroErrorReporting() {
  const reportError = React.useCallback(
    async (error: Error, context?: Record<string, any>) => {
      try {
        await fetch('/api/maestro/v1/errors/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            context,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString(),
          }),
        })
      } catch (reportError) {
        console.error('Failed to report error:', reportError)
      }
    },
    []
  )

  return { reportError }
}
