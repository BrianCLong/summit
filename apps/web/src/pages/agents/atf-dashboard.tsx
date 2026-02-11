import React from 'react';
import { Card, CardHeader, CardContent, Typography, Table, TableBody, TableCell, TableHead, TableRow, Button } from '@mui/material';

// Mock hook
const useAgentRegistry = () => {
  return {
    agents: [
      { id: 'agent-1', level: 'intern', tasksCompleted: 5, successRate: 0.8, promotionEligible: false },
      { id: 'agent-2', level: 'senior', tasksCompleted: 150, successRate: 0.99, promotionEligible: true },
    ],
    metrics: {
      levelDistribution: { intern: 1, junior: 0, senior: 1, principal: 0 },
    }
  };
};

const LevelDistributionChart = ({ data }: { data: any }) => <div>Chart Placeholder: {JSON.stringify(data)}</div>;
const AgentTable = ({ agents }: { agents: any[], columns: string[], actions: string[] }) => (
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>ID</TableCell>
        <TableCell>Level</TableCell>
        <TableCell>Tasks</TableCell>
        <TableCell>Success Rate</TableCell>
        <TableCell>Actions</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {agents.map((agent) => (
        <TableRow key={agent.id}>
          <TableCell>{agent.id}</TableCell>
          <TableCell>{agent.level}</TableCell>
          <TableCell>{agent.tasksCompleted}</TableCell>
          <TableCell>{(agent.successRate * 100).toFixed(0)}%</TableCell>
          <TableCell>
            <Button size="small">View</Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
const PromotionQueue = ({ agents }: { agents: any[] }) => (
  <div>
    {agents.map(a => <div key={a.id}>{a.id} ({a.level}) -> Next Level <Button>Promote</Button></div>)}
  </div>
);

export function ATFDashboard() {
  const { agents, metrics } = useAgentRegistry();

  return (
    <div className="space-y-6">
      <Typography variant="h4">Agentic Trust Framework</Typography>

      {/* Level distribution */}
      <Card>
        <CardHeader title="Agent Distribution by Level" />
        <CardContent>
          <LevelDistributionChart data={metrics.levelDistribution} />
        </CardContent>
      </Card>

      {/* Agent list */}
      <Card>
        <CardHeader title="Registered Agents" />
        <CardContent>
          <AgentTable
            agents={agents}
            columns={['id', 'level', 'tasksCompleted', 'successRate']}
            actions={['view', 'promote', 'quarantine']}
          />
        </CardContent>
      </Card>

      {/* Promotion queue */}
      <Card>
        <CardHeader title="Eligible for Promotion" />
        <CardContent>
          <PromotionQueue
            agents={agents.filter(a => a.promotionEligible)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
