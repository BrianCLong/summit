import React, { useEffect, useState } from 'react'
import { useSearchParams, Link, Navigate } from 'react-router-dom'
import { CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided.')
      return
    }

    const verify = async () => {
      try {
        const response = await fetch('/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Verification failed')
        }

        setStatus('success')
      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Verification failed')
      }
    }

    verify()
  }, [token])

  if (!token) {
    return <Navigate to="/signin" replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <Card className="glass-morphism border-blue-500/20 w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 flex items-center justify-center mb-4">
            {status === 'verifying' && (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            )}
            {status === 'success' && (
              <CheckCircle className="h-16 w-16 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-16 w-16 text-red-500" />
            )}
          </div>
          <CardTitle className="text-white text-2xl">
            {status === 'verifying' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-blue-200">
            {status === 'verifying' && 'Please wait while we verify your email address.'}
            {status === 'success' && 'Your account has been successfully verified. You can now access the platform.'}
            {status === 'error' && (message || 'The verification link is invalid or has expired.')}
          </p>

          <div className="pt-4">
            {status === 'success' && (
              <Link to="/signin">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Continue to Sign In <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
            {status === 'error' && (
              <div className="space-y-3">
                <Link to="/signup">
                  <Button variant="outline" className="w-full text-white border-white/20 hover:bg-white/10">
                    Register Again
                  </Button>
                </Link>
                <div className="text-sm text-slate-400">
                  <Link to="/signin" className="hover:text-white">
                    Back to Sign In
                  </Link>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
