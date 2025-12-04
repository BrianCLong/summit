import React, { useState, useEffect } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ContextualNudgeProps {
  stepId: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const ContextualNudge: React.FC<ContextualNudgeProps> = ({
  stepId,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if this step is already completed
    const progress = JSON.parse(localStorage.getItem('activation_progress') || '{}');
    if (!progress[stepId]) {
      setIsVisible(true);
    }
  }, [stepId]);

  const handleDismiss = () => {
    setIsVisible(false);
    // Optionally save dismissal state so it doesn't reappear immediately
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300">
      <Card className="border-l-4 border-l-yellow-500 shadow-xl">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center text-yellow-600 dark:text-yellow-500">
              <Lightbulb className="h-5 w-5 mr-2" />
              <span className="font-semibold">{title}</span>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
            {description}
          </p>
          {actionLabel && onAction && (
            <Button size="sm" variant="outline" className="w-full" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
