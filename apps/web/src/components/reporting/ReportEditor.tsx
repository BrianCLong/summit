import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export const ReportEditor: React.FC = () => {
  const [content, setContent] = useState('')
  const [citations, setCitations] = useState<
    { evidenceId: string; text: string }[]
  >([])
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const addCitation = () => {
    // Mock citation addition
    const id = prompt('Enter Evidence ID:')
    if (id) {
      setCitations([
        ...citations,
        { evidenceId: id, text: `Evidence content for ${id}` },
      ])
    }
  }

  const handlePublish = async () => {
    setError(null)
    try {
      const res = await fetch('/reporting/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Investigation Report',
          sections: [{ title: 'Main Body', content, type: 'text' }],
          citations,
          ch: [
            'Hypothesis A: It was a cyberattack',
            'Hypothesis B: It was an insider',
          ],
          coi: ['No conflicts declared'],
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Report Studio</h2>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="w-full h-64 p-2 border rounded"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your analysis here..."
            />
            <div className="flex gap-2">
              <Button onClick={addCitation}>+ Add Citation</Button>
              <Button onClick={handlePublish} variant="default">
                Publish Report
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Citations & Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            {citations.length === 0 && (
              <p className="text-gray-500">No citations attached.</p>
            )}
            <ul className="list-disc pl-5">
              {citations.map((c, i) => (
                <li key={i}>{c.evidenceId}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {result && (
        <Card className="bg-green-50">
          <CardHeader>
            <CardTitle>Published Successfully</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(result.manifest, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
