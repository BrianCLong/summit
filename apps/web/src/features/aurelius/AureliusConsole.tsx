
import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock API calls for UI demo
const mockApi = {
  searchPriorArt: async (query: string) => [
    { title: 'System for X', score: 0.85, id: '1' },
    { title: 'Method for Y', score: 0.72, id: '2' }
  ],
  generateInvention: async (concepts: string, problem: string) => ({
    title: `Novel System for ${concepts}`,
    abstract: `A system solving ${problem}...`,
    claims: ['Claim 1...', 'Claim 2...'],
    noveltyScore: 0.88
  })
};

export const AureliusConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState('ip-explorer');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Aurelius IP Engine</h1>
        <Badge variant="outline">Strategic Foresight Active</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ip-explorer">IP Explorer</TabsTrigger>
          <TabsTrigger value="invention-workbench">Invention Workbench</TabsTrigger>
          <TabsTrigger value="foresight">Strategic Foresight</TabsTrigger>
        </TabsList>

        <TabsContent value="ip-explorer">
          <IPExplorerPane />
        </TabsContent>

        <TabsContent value="invention-workbench">
          <InventionWorkbenchPane />
        </TabsContent>

        <TabsContent value="foresight">
          <ForesightPane />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const IPExplorerPane = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    const data = await mockApi.searchPriorArt(query);
    setResults(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Patent Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search concepts, patents, or prior art..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button onClick={handleSearch}>Search</Button>
        </div>
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.id} className="p-4 border rounded hover:bg-muted/50">
              <div className="font-semibold">{r.title}</div>
              <div className="text-sm text-muted-foreground">Relevance: {(r.score * 100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const InventionWorkbenchPane = () => {
  const [problem, setProblem] = useState('');
  const [concepts, setConcepts] = useState('');
  const [draft, setDraft] = useState<any>(null);

  const handleGenerate = async () => {
    const data = await mockApi.generateInvention(concepts, problem);
    setDraft(data);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>Invention Parameters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Problem Statement</label>
            <Input value={problem} onChange={e => setProblem(e.target.value)} placeholder="Describe the technical problem..." />
          </div>
          <div>
            <label className="text-sm font-medium">Key Concepts</label>
            <Input value={concepts} onChange={e => setConcepts(e.target.value)} placeholder="Comma-separated concepts..." />
          </div>
          <Button onClick={handleGenerate} className="w-full">Generate Candidate Draft</Button>
        </CardContent>
      </Card>

      {draft && (
        <Card>
          <CardHeader>
            <CardTitle>{draft.title}</CardTitle>
            <Badge variant={draft.noveltyScore > 0.8 ? 'default' : 'secondary'}>
              Novelty Score: {(draft.noveltyScore * 100).toFixed(0)}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/30 rounded text-sm">
              <strong>Abstract:</strong> {draft.abstract}
            </div>
            <div>
              <strong>Claims:</strong>
              <ul className="list-disc pl-5 text-sm mt-2">
                {draft.claims.map((c: string, i: number) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const ForesightPane = () => {
    return (
        <Card>
            <CardHeader><CardTitle>Simulation Engine</CardTitle></CardHeader>
            <CardContent>
                <div className="text-muted-foreground text-sm">
                    Zephyrus Simulation Engine active. Run scenarios to forecast technology trajectories.
                </div>
                {/* Placeholder for complex chart UI */}
                <div className="h-64 bg-muted/20 rounded mt-4 flex items-center justify-center border border-dashed">
                    Forecast Visualization Area
                </div>
            </CardContent>
        </Card>
    )
}
