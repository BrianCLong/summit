import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'

const DemoControlPage = () => {
  const [status, setStatus] = useState<{ status: string; mode: string } | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [lastAction, setLastAction] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/demo/status')
      const data = await res.json()
      setStatus(data)
    } catch (e) {
      console.error(e)
      setStatus({ status: 'error', mode: 'unknown' })
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleAction = async (action: 'seed' | 'reset') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/demo/${action}`, { method: 'POST' })
      const data = await res.json()
      setLastAction(`Success: ${JSON.stringify(data)}`)
    } catch (e) {
      setLastAction(`Error: ${e}`)
    } finally {
      setLoading(false)
      fetchStatus()
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Demo Control</CardTitle>
          <CardDescription>Manage the demo environment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded">
            <span className="font-semibold">Current Status</span>
            <div className="flex gap-2">
              <span
                className={`px-2 py-1 rounded text-sm ${status?.status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              >
                {status?.status || 'Loading...'}
              </span>
              <span className="px-2 py-1 rounded text-sm bg-blue-100 text-blue-800">
                Mode: {status?.mode || '...'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => handleAction('seed')}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Processing...' : 'Seed Demo Data'}
            </Button>
            <Button
              onClick={() => handleAction('reset')}
              variant="destructive"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Processing...' : 'Reset Environment'}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => (window.location.href = '/cases')}
            >
              Go to Cases
            </Button>
          </div>

          {lastAction && (
            <Alert className="mt-4">
              <AlertTitle>Result</AlertTitle>
              <AlertDescription>{lastAction}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DemoControlPage
