import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EvidenceTrailPeek } from '@/components/EvidenceTrailPeek';

export function AnswerCard({
  answerId,
  title,
  summary,
  nodeId,
}: {
  answerId: string;
  title: string;
  summary: string;
  nodeId?: string;
}) {
  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{summary}</p>
        <EvidenceTrailPeek answerId={answerId} nodeId={nodeId} />
      </CardContent>
    </Card>
  );
}
