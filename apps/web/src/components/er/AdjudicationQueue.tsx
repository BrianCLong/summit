import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Split, Info } from 'lucide-react';

interface CandidateGroup {
  canonicalKey: string;
  entities: any[]; // In real app, define proper Entity type
}

interface GuardrailMetrics {
  precision: number;
  recall: number;
}

interface GuardrailThresholds {
  minPrecision: number;
  minRecall: number;
  matchThreshold: number;
}

interface GuardrailStatus {
  datasetId: string;
  metrics: GuardrailMetrics;
  thresholds: GuardrailThresholds;
  passed: boolean;
  evaluatedAt: string;
}

export const AdjudicationQueue: React.FC = () => {
  const [candidates, setCandidates] = useState<CandidateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CandidateGroup | null>(null);
  const [guardrails, setGuardrails] = useState<GuardrailStatus | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    fetchCandidates();
    fetchGuardrails();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/er/candidates');
      if (res.ok) {
        const data = await res.json();
        // Transform the map/array response to local state
        // Assuming API returns array of groups
        setCandidates(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuardrails = async () => {
    try {
      const res = await fetch('/er/guardrails');
      if (res.ok) {
        const data = await res.json();
        setGuardrails(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMerge = async (masterId: string, mergeIds: string[]) => {
    try {
      if (guardrails && !guardrails.passed && !overrideReason.trim()) {
        alert('Guardrails failed. Provide an override reason to proceed.');
        return;
      }

      const res = await fetch('/er/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterId,
          mergeIds,
          rationale: 'Manual adjudication',
          guardrailDatasetId: guardrails?.datasetId,
          guardrailOverrideReason: guardrails?.passed ? undefined : overrideReason.trim(),
        })
      });
      if (res.ok) {
        // Remove from list
        setCandidates(prev => prev.filter(c => c !== selectedGroup));
        setSelectedGroup(null);
        setOverrideReason('');
        fetchGuardrails();
      } else {
        alert('Merge failed - check policy?');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 h-full p-4">
      <div className="col-span-4 border-r pr-4">
        <h2 className="text-xl font-bold mb-4">Adjudication Queue</h2>
        <ScrollArea className="h-[80vh]">
          {loading && <div>Loading candidates...</div>}
          {candidates.map((group, idx) => (
            <Card
              key={idx}
              className={`mb-2 cursor-pointer ${selectedGroup === group ? 'border-primary' : ''}`}
              onClick={() => setSelectedGroup(group)}
            >
              <CardContent className="p-4">
                <div className="font-semibold">Key: {group.canonicalKey}</div>
                <div className="text-sm text-gray-500">{group.entities.length} candidates</div>
              </CardContent>
            </Card>
          ))}
        </ScrollArea>
      </div>

      <div className="col-span-8 pl-4">
        {selectedGroup ? (
          <EntityDiffPane
            group={selectedGroup}
            onMerge={handleMerge}
            guardrails={guardrails}
            overrideReason={overrideReason}
            onOverrideReasonChange={setOverrideReason}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a candidate group to adjudicate
          </div>
        )}
      </div>
    </div>
  );
};

interface DiffPaneProps {
  group: CandidateGroup;
  onMerge: (masterId: string, mergeIds: string[]) => void;
  guardrails: GuardrailStatus | null;
  overrideReason: string;
  onOverrideReasonChange: (value: string) => void;
}

const EntityDiffPane: React.FC<DiffPaneProps> = ({
  group,
  onMerge,
  guardrails,
  overrideReason,
  onOverrideReasonChange,
}) => {
  const [masterId, setMasterId] = useState<string>(group.entities[0]?.id);
  const [explanation, setExplanation] = useState<any>(null);

  useEffect(() => {
    // Fetch explanation for the group relative to master
    if (group.entities.length > 1) {
       // Just example logic: explain 0 vs 1
       fetch('/er/explain', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ entityA: group.entities[0], entityB: group.entities[1] })
       })
       .then(res => res.json())
       .then(data => setExplanation(data))
       .catch(console.error);
    }
  }, [group, masterId]);

  return (
    <div className="space-y-6">
      {guardrails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Guardrail Status
              <Badge variant={guardrails.passed ? 'success' : 'error'}>
                {guardrails.passed ? 'PASS' : 'FAIL'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span>Dataset</span>
              <span className="font-medium">{guardrails.datasetId}</span>
            </div>
            <div className="flex justify-between">
              <span>Precision</span>
              <span className="font-medium">
                {Math.round(guardrails.metrics.precision * 100)}% (min{' '}
                {Math.round(guardrails.thresholds.minPrecision * 100)}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span>Recall</span>
              <span className="font-medium">
                {Math.round(guardrails.metrics.recall * 100)}% (min{' '}
                {Math.round(guardrails.thresholds.minRecall * 100)}%)
              </span>
            </div>
            {!guardrails.passed && (
              <div className="space-y-2">
                <div className="text-xs text-red-500">
                  Guardrails failed. Provide a reason to override.
                </div>
                <Textarea
                  value={overrideReason}
                  onChange={(event) => onOverrideReasonChange(event.target.value)}
                  placeholder="Override reason (required)"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Merge Candidates</h3>
        <Button
          variant="default"
          onClick={() => onMerge(masterId, group.entities.map(e => e.id).filter(id => id !== masterId))}
        >
          <Split className="mr-2 h-4 w-4" /> Merge into Master
        </Button>
      </div>

      {explanation && (
        <Card>
           <CardHeader>
             <CardTitle className="flex items-center"><Info className="mr-2"/> AI Explanation</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="space-y-2">
               <div className="flex justify-between">
                 <span>Score:</span>
                 <Badge variant={explanation.score > 0.8 ? 'default' : 'secondary'}>
                   {Math.round(explanation.score * 100)}%
                 </Badge>
               </div>
               <div>
                 <strong>Rationale:</strong>
                 <ul className="list-disc pl-5">
                   {explanation.rationale.map((r: string, i: number) => (
                     <li key={i}>{r}</li>
                   ))}
                 </ul>
               </div>
             </div>
           </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
         {group.entities.map(entity => (
           <Card
             key={entity.id}
             className={`cursor-pointer ${masterId === entity.id ? 'ring-2 ring-primary' : ''}`}
             onClick={() => setMasterId(entity.id)}
           >
             <CardHeader className="pb-2">
               <CardTitle className="text-lg flex justify-between">
                 {entity.properties.name || 'Unnamed'}
                 {masterId === entity.id && <Badge>Master</Badge>}
               </CardTitle>
             </CardHeader>
             <CardContent className="text-sm space-y-1">
               <div>ID: {entity.id}</div>
               <div>Email: {entity.properties.email}</div>
               <div>Geo: {entity.properties.lat}, {entity.properties.lon}</div>
               {entity.lacLabels && (
                 <div className="text-red-500 text-xs">LAC: {entity.lacLabels.join(', ')}</div>
               )}
             </CardContent>
           </Card>
         ))}
      </div>
    </div>
  );
};
