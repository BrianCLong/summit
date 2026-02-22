
import React, { useState, useEffect, useRef } from 'react';
import $ from 'jquery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Play, RotateCcw, AlertTriangle, CheckCircle, Code, BookOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';

// Define types locally if not available globally
interface TranslationResult {
  ast: any;
  cypher: string;
  rationale: { phrase: string; clause: string }[];
  estimatedCost: number;
  isValid?: boolean;
  validationError?: string;
  // GraphRAG extensions
  citations?: { id: string; source: string; url?: string; confidence: number }[];
}

const QUICK_PROMPTS = [
  "Find all User nodes with email 'admin@example.com'",
  "List organizations created in the last 7 days",
  "Show relationships between User and Organization",
  "Summarize evidence for incident 'INC-123'",
];

export function CopilotPanel() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [editedCypher, setEditedCypher] = useState('');
  const [sandboxResult, setSandboxResult] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('prompt');
  const { toast } = useToast();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // jQuery ref for the action panel
  const actionPanelRef = useRef<HTMLDivElement>(null);

  // jQuery effect for Action Panel buttons
  useEffect(() => {
    if (actionPanelRef.current) {
      const $panel = $(actionPanelRef.current);
      $panel.find('.action-btn').hover(
        function(this: HTMLElement) { $(this).stop().animate({ opacity: 0.8 }, 100); },
        function(this: HTMLElement) { $(this).stop().animate({ opacity: 1 }, 100); }
      );
    }
  }, [result]);

  // jQuery effect for Sandbox Results - fixed race condition
  useEffect(() => {
    if (activeTab === 'results' && sandboxResult && actionPanelRef.current) {
        // Use a small timeout to ensure DOM render cycle is complete
        setTimeout(() => {
            $(actionPanelRef.current).find('.result-area').hide().fadeIn(500);
        }, 50);
    }
  }, [activeTab, sandboxResult]);

  const handleTranslate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    setSandboxResult(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/nl2cypher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt, validate: true }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Translation failed');

      setResult(data);
      setEditedCypher(data.cypher);
      setActiveTab('preview');

      toast({
        title: "Translation Complete",
        description: `Cost Estimate: ${data.estimatedCost} units`,
      });

    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSandboxRun = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/sandbox/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cypher: editedCypher }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Execution failed');

      setSandboxResult(data.rows);
      setActiveTab('results');
      // Animation handled by useEffect now
    } catch (err: any) {
      toast({
        title: "Execution Error",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = () => {
    if (result) {
      setEditedCypher(result.cypher);
      toast({ title: "Rolled back to generated Cypher" });
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex justify-between items-center">
            <span>Copilot v0.9</span>
            {result?.isValid === false && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" aria-hidden="true" /> Invalid Syntax
              </Badge>
            )}
            {result?.isValid === true && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="w-3 h-3 mr-1" aria-hidden="true" /> Valid
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList>
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="preview" disabled={!result}>Preview</TabsTrigger>
              <TabsTrigger value="results" disabled={!sandboxResult}>Results</TabsTrigger>
              {result?.citations && result.citations.length > 0 && (
                <TabsTrigger value="citations">Evidence</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="prompt" className="flex-1 flex flex-col gap-4 pt-4">
              <div className="grid w-full gap-1.5 flex-1">
                <Label htmlFor="copilot-prompt">Prompt</Label>
                <Textarea
                  ref={textareaRef}
                  id="copilot-prompt"
                  placeholder="Ask a question about the graph (e.g., 'find User where email is ...')"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  className="flex-1 resize-none"
                />

                {!prompt && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Try:
                    </span>
                    {QUICK_PROMPTS.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPrompt(p);
                          setTimeout(() => textareaRef.current?.focus(), 0);
                        }}
                        aria-label={`Use prompt: ${p}`}
                        className="rounded-full border border-input bg-background px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={handleTranslate}
                loading={loading}
                className="w-full"
              >
                Generate Cypher
              </Button>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 flex flex-col gap-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                <div className="flex flex-col gap-2">
                  <div className="font-semibold text-sm">Generated Cypher</div>
                  <Textarea
                    value={editedCypher}
                    onChange={e => setEditedCypher(e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRollback}
                      disabled={editedCypher === result?.cypher}
                      aria-label="Rollback to original Cypher"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" aria-hidden="true" /> Rollback
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                         <Button size="sm" variant="ghost" aria-label="Show Cypher diff">
                           <Code className="w-4 h-4 mr-1" aria-hidden="true" /> Diff
                         </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Diff</DialogTitle></DialogHeader>
                        <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                          <div className="bg-muted p-2 rounded">
                            <div className="font-bold mb-1">Original</div>
                            {result?.cypher}
                          </div>
                          <div className="bg-muted p-2 rounded">
                            <div className="font-bold mb-1">Current</div>
                            {editedCypher}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="font-semibold text-sm">Rationale</div>
                  <div className="bg-muted p-2 rounded flex-1 overflow-auto text-sm">
                    {result?.rationale.map((r, i) => (
                      <div key={i} className="mb-2">
                        <span className="font-medium text-primary">"{r.phrase}"</span>
                        <br/>
                        <span className="font-mono text-xs text-muted-foreground">→ {r.clause}</span>
                      </div>
                    ))}
                  </div>
                  {result?.validationError && (
                    <div className="bg-red-50 text-red-600 p-2 rounded text-xs border border-red-200">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      {result.validationError}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Panel - powered by jQuery for interactions */}
              <div ref={actionPanelRef} className="border-t pt-4 mt-2">
                <div className="flex justify-between items-center bg-secondary/20 p-2 rounded">
                  <span className="text-xs font-mono">EST. COST: {result?.estimatedCost}</span>
                  <div className="flex gap-2">
                    <Button
                      className="action-btn bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleSandboxRun}
                      loading={loading}
                      disabled={!result?.isValid}
                      aria-label="Run Cypher query in sandbox"
                    >
                      {!loading && (
                        <Play className="w-4 h-4 mr-1" aria-hidden="true" />
                      )}
                      Run in Sandbox
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="results" className="flex-1 pt-4 overflow-auto">
              <div className="result-area">
                 {sandboxResult && sandboxResult.length === 0 && (
                   <div className="text-center text-muted-foreground py-8">No results found.</div>
                 )}
                 {sandboxResult && sandboxResult.length > 0 && (
                   <table className="w-full text-sm border-collapse">
                     <thead>
                       <tr className="border-b">
                         {Object.keys(sandboxResult[0]).map(k => (
                           <th key={k} className="text-left p-2 bg-muted/50">{k}</th>
                         ))}
                       </tr>
                     </thead>
                     <tbody>
                       {sandboxResult.map((row, i) => (
                         <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                           {Object.values(row).map((v: any, j) => (
                             <td key={j} className="p-2 font-mono text-xs max-w-[200px] truncate">
                               {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                             </td>
                           ))}
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 )}
              </div>
            </TabsContent>

            {/* GraphRAG Evidence/Citations Tab */}
            <TabsContent value="citations" className="flex-1 pt-4 overflow-auto">
              <div className="grid grid-cols-1 gap-4">
                {result?.citations?.map((cit, i) => (
                  <Card key={i}>
                    <CardHeader className="py-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">{cit.source}</span>
                        <Badge variant="outline">{(cit.confidence * 100).toFixed(0)}% Conf.</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2 text-sm text-muted-foreground flex gap-2 items-center">
                      <BookOpen className="w-4 h-4" />
                      <span>ID: {cit.id}</span>
                      {cit.url && <a href={cit.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline ml-2">View Source</a>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
