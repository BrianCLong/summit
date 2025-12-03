import React, { useState, useEffect } from 'react';
import MonacoEditor from 'react-monaco-editor';
import ReactJson from 'react-json-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export const OPAPlaygroundPage = () => {
  const [policies, setPolicies] = useState<string[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<string>('');
  const [policyContent, setPolicyContent] = useState<string>('package play\n\ndefault allow = false\n\nallow {\n  input.user == "admin"\n}');
  const [inputContent, setInputContent] = useState<string>('{\n  "user": "admin"\n}');
  const [output, setOutput] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const res = await fetch('/api/opa/policies', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies || []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load policies');
    }
  };

  const loadPolicy = async (filename: string) => {
    if (!filename) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/opa/policies/${filename}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPolicyContent(data.content);
        setSelectedPolicy(filename);
      } else {
        toast.error('Failed to load policy content');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error loading policy');
    } finally {
      setLoading(false);
    }
  };

  const runEvaluation = async () => {
    try {
      setLoading(true);
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(inputContent);
      } catch (e) {
        toast.error('Invalid JSON input');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/opa/evaluate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          policy: policyContent,
          input: parsedInput
        })
      });

      const data = await res.json();
      if (res.ok) {
        setOutput(data);
        toast.success('Evaluation complete');
      } else {
        setOutput(data); // Show error in output
        toast.error('Evaluation failed');
      }
    } catch (e) {
      console.error(e);
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const validatePolicy = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/opa/validate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ policy: policyContent })
      });
      const data = await res.json();
      if (data.valid) {
        toast.success('Policy is valid');
      } else {
        toast.error('Validation failed');
        setOutput({ error: data.error });
      }
    } catch (e) {
      console.error(e);
      toast.error('Validation error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">OPA Policy Playground</h1>
        <div className="flex gap-2">
          <Select value={selectedPolicy} onValueChange={loadPolicy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Load Policy" />
            </SelectTrigger>
            <SelectContent>
              {policies.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={validatePolicy} variant="secondary" disabled={loading}>Validate</Button>
          <Button onClick={runEvaluation} disabled={loading}>Evaluate</Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col gap-4">
            <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader className="py-2"><CardTitle className="text-sm">Policy (Rego)</CardTitle></CardHeader>
                <CardContent className="flex-1 p-0 min-h-0 relative">
                    <div className="absolute inset-0">
                        <MonacoEditor
                            language="ruby" // Monaco doesn't have built-in Rego, Ruby or Python is closest syntax highlighting
                            theme="vs-dark"
                            value={policyContent}
                            options={{ minimap: { enabled: false }, automaticLayout: true }}
                            onChange={setPolicyContent}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="flex flex-col gap-4">
            <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader className="py-2"><CardTitle className="text-sm">Input (JSON)</CardTitle></CardHeader>
                 <CardContent className="flex-1 p-0 min-h-0 relative">
                    <div className="absolute inset-0">
                        <MonacoEditor
                            language="json"
                            theme="vs-dark"
                            value={inputContent}
                            options={{ minimap: { enabled: false }, automaticLayout: true }}
                            onChange={setInputContent}
                        />
                    </div>
                </CardContent>
            </Card>
            <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader className="py-2"><CardTitle className="text-sm">Output</CardTitle></CardHeader>
                <CardContent className="flex-1 p-4 overflow-auto bg-slate-950 text-slate-50">
                     <ReactJson
                        src={output}
                        theme="ocean"
                        displayDataTypes={false}
                        enableClipboard={true}
                        style={{ backgroundColor: 'transparent' }}
                     />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
};
