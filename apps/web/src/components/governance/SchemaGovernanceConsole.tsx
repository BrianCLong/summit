
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Types (simplified for frontend)
interface SchemaVersion {
  id: string;
  version: string;
  status: string;
  definition: any;
  createdAt: string;
}

interface ChangeRequest {
  id: string;
  title: string;
  status: string;
  author: string;
}

interface Vocabulary {
    id: string;
    name: string;
    description: string;
    concepts: any[];
}

export function SchemaGovernanceConsole() {
  const [activeTab, setActiveTab] = useState('schemas');
  const [schemas, setSchemas] = useState<SchemaVersion[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
        if (activeTab === 'schemas') {
            const res = await fetch('/api/governance/schemas');
            if (res.ok) setSchemas(await res.json());
        } else if (activeTab === 'changes') {
            const res = await fetch('/api/governance/changes');
            if (res.ok) setChanges(await res.json());
        } else if (activeTab === 'vocabularies') {
            const res = await fetch('/api/governance/vocabularies');
            if (res.ok) setVocabularies(await res.json());
        }
    } catch (e) {
        console.error("Failed to fetch governance data", e);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Ontology & Schema Governance</h1>
        <Button onClick={() => fetchData()}>Refresh</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="schemas">Schemas</TabsTrigger>
          <TabsTrigger value="vocabularies">Vocabularies</TabsTrigger>
          <TabsTrigger value="changes">Change Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="schemas" className="mt-6">
            <div className="grid gap-4">
                {schemas.map(schema => (
                    <Card key={schema.id}>
                        <CardHeader>
                            <div className="flex justify-between">
                                <CardTitle>Version {schema.version}</CardTitle>
                                <Badge variant={schema.status === 'ACTIVE' ? 'default' : 'secondary'}>{schema.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500">Created: {new Date(schema.createdAt).toLocaleDateString()}</p>
                            <div className="mt-4">
                                <h4 className="font-semibold mb-2">Entities ({schema.definition.entities.length})</h4>
                                <div className="flex flex-wrap gap-2">
                                    {schema.definition.entities.map((e: any) => (
                                        <Badge key={e.name} variant="outline">{e.name}</Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </TabsContent>

        <TabsContent value="vocabularies">
            <div className="grid gap-4">
                 {vocabularies.length === 0 && <p>No vocabularies found.</p>}
                 {vocabularies.map(vocab => (
                    <Card key={vocab.id}>
                        <CardHeader>
                             <CardTitle>{vocab.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <p className="text-sm text-gray-500">{vocab.description}</p>
                             <div className="mt-4">
                                 <h4 className="font-semibold mb-2">Concepts ({vocab.concepts.length})</h4>
                                 <div className="flex flex-wrap gap-2">
                                     {vocab.concepts.map((c: any) => (
                                         <Badge key={c.id} variant="outline">{c.term}</Badge>
                                     ))}
                                 </div>
                             </div>
                        </CardContent>
                    </Card>
                 ))}
            </div>
        </TabsContent>

        <TabsContent value="changes">
             <div className="grid gap-4">
                {changes.length === 0 && <p>No change requests found.</p>}
                {changes.map(cr => (
                    <Card key={cr.id}>
                        <CardHeader>
                            <div className="flex justify-between">
                                <CardTitle>{cr.title}</CardTitle>
                                <Badge>{cr.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">Author: {cr.author}</p>
                            <div className="mt-4 flex gap-2">
                                <Button variant="outline" size="sm">View Impact</Button>
                                <Button size="sm">Review</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
