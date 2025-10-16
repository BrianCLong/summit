import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';

export type Denial = {
  time: string;
  tenant?: string;
  caseId?: string;
  reason: string;
  rule: string;
};

function suggestionFor(rule: string): string {
  const map: Record<string, string> = {
    'budget.daily.usd':
      'Reduce LLM_HEAVY usage or increase daily budget cap in Policy → Budgets.',
    'rps.max':
      'Lower request rate or raise CONDUCTOR_RPS_MAX within safe limits.',
    'route.p95':
      'Investigate slow expert; roll back canary or adjust routing weights.',
  };
  return map[rule] || 'Review policy and adjust parameters or workload.';
}

export function BudgetGuardrails({ denials = [] }: { denials?: Denial[] }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Budget Guardrails
        </Typography>
        {denials.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No budget denials recorded. Cost guard active.
          </Typography>
        ) : (
          <List dense>
            {denials.map((d, i) => (
              <ListItem key={i} divider>
                <ListItemText
                  primary={d.reason}
                  secondary={`${d.time} • ${d.tenant || 'tenant'} • case ${d.caseId || '-'} • ${suggestionFor(d.rule)}`}
                />
                <Chip size="small" label={d.rule} />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
