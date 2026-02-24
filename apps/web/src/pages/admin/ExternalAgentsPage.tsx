import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Key, Plus, Trash2, Copy, Check } from 'lucide-react';

interface Agent {
    id: string;
    name: string;
    status: string;
    roles: string[];
    createdAt: string;
}

export function ExternalAgentsPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [newAgentName, setNewAgentName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newCredentials, setNewCredentials] = useState<{ clientId: string, clientSecret: string } | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/company-os/external-agents');
            if (!res.ok) throw new Error('Failed to fetch agents');
            const data = await res.json();
            setAgents(data.agents || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAgentName.trim()) return;

        try {
            setLoading(true);
            const res = await fetch('/api/company-os/external-agents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newAgentName })
            });

            if (!res.ok) throw new Error('Registration failed');

            const data = await res.json();
            setAgents([...agents, data.agent]);
            setNewCredentials(data.credentials);
            setNewAgentName('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (id: string) => {
        if (!confirm('Are you sure you want to revoke this agent access?')) return;

        try {
            const res = await fetch(`/api/company-os/external-agents/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to revoke');
            setAgents(agents.filter(a => a.id !== id));
        } catch (err: any) {
            setError(err.message);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">External Agent Registry</h1>
                    <p className="text-muted-foreground mt-2">
                        Register and manage third-party agents (e.g., LangChain, LlamaIndex) granted access to Summit Governance APIs.
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
                    {error}
                </div>
            )}

            {newCredentials && (
                <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                        <CardTitle className="text-green-800 flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Agent Registered Successfully
                        </CardTitle>
                        <CardDescription className="text-green-700">
                            Please copy these credentials immediately. They will not be shown again.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-green-900">Client ID</label>
                            <div className="flex mt-1">
                                <code className="flex-1 p-2 bg-white rounded-l border border-green-200 bg-green-100">{newCredentials.clientId}</code>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-green-900">Client Secret (API Key)</label>
                            <div className="flex mt-1">
                                <code className="flex-1 p-2 bg-white rounded-l border border-green-200 bg-green-100">{newCredentials.clientSecret}</code>
                                <Button
                                    variant="outline"
                                    className="rounded-l-none border-l-0 border-green-200 bg-white"
                                    onClick={() => copyToClipboard(newCredentials.clientSecret)}
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-500" />}
                                </Button>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setNewCredentials(null)}
                        >
                            I have saved these credentials
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 border shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Register New Agent
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRegisterAgent} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Agent Integration Name</label>
                                <Input
                                    placeholder="e.g., LangChain Data Agent"
                                    value={newAgentName}
                                    onChange={(e) => setNewAgentName(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Registering...' : 'Generate API Credentials'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5" />
                            Active External Agents
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading && !agents.length ? (
                            <p className="text-muted-foreground">Loading agents...</p>
                        ) : agents.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No external agents registered yet.</p>
                        ) : (
                            <div className="divide-y rounded-md border">
                                {agents.map((agent) => (
                                    <div key={agent.id} className="p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors">
                                        <div>
                                            <div className="font-medium">{agent.name}</div>
                                            <div className="text-sm text-gray-500 font-mono mt-1 pr-4">{agent.id}</div>
                                            <div className="flex gap-2 mt-2">
                                                {agent.roles.map(role => (
                                                    <Badge key={role} variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                                                        {role}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-xs text-gray-400">
                                                Added {new Date(agent.createdAt).toLocaleDateString()}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleRevoke(agent.id)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Revoke Access
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default ExternalAgentsPage;
