import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';

interface AgentHealth {
  cpuUsage: number;
  memoryUsage: number;
  lastHeartbeat: string;
  activeTasks: number;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'IDLE' | 'BUSY' | 'OFFLINE' | 'ERROR';
  health: AgentHealth;
}

export const AgentHealthDashboard: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
     // Mock fetch
     const fetchAgents = async () => {
        // const res = await fetch('/api/meta-orchestrator/agents');
        // const data = await res.json();
        // setAgents(data);

        // Mock data for display
        setAgents([
            {
                id: 'agent-1',
                name: 'Research Agent Alpha',
                role: 'Researcher',
                status: 'BUSY',
                health: { cpuUsage: 45, memoryUsage: 1024, lastHeartbeat: new Date().toISOString(), activeTasks: 2 }
            },
            {
                id: 'agent-2',
                name: 'Reviewer Bot',
                role: 'Reviewer',
                status: 'IDLE',
                health: { cpuUsage: 5, memoryUsage: 512, lastHeartbeat: new Date().toISOString(), activeTasks: 0 }
            },
            {
                id: 'agent-3',
                name: 'Synthesis Engine',
                role: 'Writer',
                status: 'OFFLINE',
                health: { cpuUsage: 0, memoryUsage: 0, lastHeartbeat: new Date(Date.now() - 3600000).toISOString(), activeTasks: 0 }
            }
        ]);
     };
     fetchAgents();

     const interval = setInterval(fetchAgents, 5000);
     return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
      switch (status) {
          case 'IDLE': return 'bg-green-500';
          case 'BUSY': return 'bg-blue-500';
          case 'OFFLINE': return 'bg-slate-500';
          case 'ERROR': return 'bg-red-500';
          default: return 'bg-slate-500';
      }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Agent Health Monitor</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map(agent => (
            <Card key={agent.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium">
                        {agent.name}
                    </CardTitle>
                    <div className={`h-3 w-3 rounded-full ${getStatusColor(agent.status)}`} title={agent.status} />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Role:</span>
                            <span className="font-medium text-foreground">{agent.role}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Active Tasks:</span>
                            <span className="font-medium text-foreground">{agent.health.activeTasks}</span>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>CPU Usage</span>
                                <span>{agent.health.cpuUsage}%</span>
                            </div>
                            <Progress value={agent.health.cpuUsage} className="h-2" />
                        </div>

                         <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Memory (MB)</span>
                                <span>{agent.health.memoryUsage}</span>
                            </div>
                            <Progress value={(agent.health.memoryUsage / 2048) * 100} className="h-2" />
                        </div>

                        <div className="text-xs text-muted-foreground pt-2">
                            Last heartbeat: {new Date(agent.health.lastHeartbeat).toLocaleTimeString()}
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
};
