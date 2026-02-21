import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

export const ReviewQueue = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Queue</CardTitle>
      </CardHeader>
      <CardContent>
        <p>No items in review queue.</p>
      </CardContent>
    </Card>
  );
};
