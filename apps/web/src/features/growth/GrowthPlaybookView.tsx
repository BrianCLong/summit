import React from 'react';
import { Playbook } from './types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, AlertTriangle, TrendingUp, Target } from 'lucide-react';

interface GrowthPlaybookViewProps {
  playbook: Playbook;
}

export function GrowthPlaybookView({ playbook }: GrowthPlaybookViewProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{playbook.title}</CardTitle>
              <CardDescription className="mt-2">{playbook.summary}</CardDescription>
            </div>
            <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium text-muted-foreground">Readiness Score</span>
              <span className="text-3xl font-bold text-primary">{playbook.score}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {playbook.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-1 bg-green-50 text-green-700 border-green-200">
                    Strong
                  </Badge>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {playbook.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-700 border-amber-200">
                    Focus
                  </Badge>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Strategic Initiatives
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {playbook.strategic_initiatives.map((init, i) => (
              <div key={i} className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{init.title}</h3>
                  <Badge>{init.timeline}</Badge>
                </div>
                <p className="text-muted-foreground">{init.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            Tactical Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {playbook.tactical_actions.map((action, i) => (
              <li key={i} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                <div className="h-6 w-6 rounded-full border-2 border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {i + 1}
                </div>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
