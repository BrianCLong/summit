import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const PrivacyBudgetDisplay = () => {
  const [budget, setBudget] = useState<{ remaining: number; total: number }>({ remaining: 10, total: 10 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, fetch from API
    // fetch('/api/privacy/budget').then(...)
    // Mocking for now as per instructions
    setTimeout(() => {
      setBudget({ remaining: 7.5, total: 10.0 });
      setLoading(false);
    }, 500);
  }, []);

  const percentage = (budget.remaining / budget.total) * 100;

  return (
    <Card className="w-[300px]">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Privacy Budget</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Progress value={percentage} className={percentage < 20 ? "bg-red-200" : "bg-green-200"} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Remaining: ε = {budget.remaining.toFixed(1)}</span>
            <span>Total: ε = {budget.total.toFixed(1)}</span>
          </div>
          <p className="text-xs text-gray-500">
            Budget resets in 24h. Heavy queries consume more budget.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
