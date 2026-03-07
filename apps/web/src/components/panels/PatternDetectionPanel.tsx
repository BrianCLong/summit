/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { Play, Loader2, AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'

interface PatternTemplate {
  key: string
  description: string
  cypher?: string
}

interface PatternDetectionPanelProps {
  onResults: (entities: any[], relationships: any[]) => void
  className?: string
}

export function PatternDetectionPanel({
  onResults,
  className,
}: PatternDetectionPanelProps) {
  const [templates, setTemplates] = useState<Record<string, PatternTemplate>>(
    {}
  )
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/patterns/templates', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch templates')
      }
      const data = await res.json()
      setTemplates(data.data)
    } catch (err) {
      console.error(err)
      setError('Failed to load pattern templates')
    } finally {
      setLoading(false)
    }
  }

  const handleRun = async () => {
    if (!selectedTemplate) return

    try {
      setRunning(true)
      setError(null)
      const res = await fetch(
        `/api/patterns/templates/${selectedTemplate}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({}), // Params can be added here later
        }
      )

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to execute pattern')
      }

      const data = await res.json()

      // Data might be nested under 'data' and contain { nodes, edges } arrays
      // We need to flatten this if it returns multiple matches
      const allEntities: any[] = []
      const allRelationships: any[] = []

      if (Array.isArray(data.data)) {
        data.data.forEach((match: any) => {
          if (match.nodes) allEntities.push(...match.nodes)
          if (match.edges) allRelationships.push(...match.edges)
        })
      }

      // Deduplicate by ID
      const uniqueEntities = Array.from(
        new Map(allEntities.map(e => [e.id, e])).values()
      )
      const uniqueRelationships = Array.from(
        new Map(allRelationships.map(r => [r.id, r])).values()
      )

      onResults(uniqueEntities, uniqueRelationships)

      if (uniqueEntities.length === 0) {
        setError('No matches found for this pattern.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className={`flex flex-col gap-4 p-4 ${className}`}>
      <div className="space-y-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Info className="h-5 w-5" />
          Pattern Detection
        </h3>
        <p className="text-sm text-muted-foreground">
          Run sophisticated graph algorithms to detect threats and anomalies.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Pattern</label>
            <Select
              value={selectedTemplate}
              onValueChange={setSelectedTemplate}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a pattern..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(templates).map(([key, tpl]) => (
                  <SelectItem key={key} value={key}>
                    {key.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate && templates[selectedTemplate] && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Description:</p>
              <p className="text-muted-foreground">
                {templates[selectedTemplate].description}
              </p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleRun}
            disabled={!selectedTemplate || running}
          >
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Analysis...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Pattern Detection
              </>
            )}
          </Button>

          {error && (
            <Alert
              variant={error.includes('No matches') ? 'default' : 'destructive'}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {error.includes('No matches') ? 'Info' : 'Error'}
              </AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}
