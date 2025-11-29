import React, { useEffect, useState } from 'react';
import { CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

interface Step {
  id: string;
  label: string;
  path: string;
  completed: boolean;
}

export const ActivationProgressTile: React.FC = () => {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<Step[]>([
    { id: 'signup', label: 'Sign Up', path: '/', completed: true }, // Assumed true if seeing this
    { id: 'tenant_created', label: 'Create Tenant', path: '/admin', completed: false },
    { id: 'first_ingest', label: 'Ingest Data', path: '/datasources', completed: false },
    { id: 'first_export', label: 'Export Report', path: '/reports', completed: false },
  ]);

  useEffect(() => {
    const checkProgress = () => {
      const progress = JSON.parse(localStorage.getItem('activation_progress') || '{}');
      setSteps(prev => prev.map(step => ({
        ...step,
        completed: step.id === 'signup' ? true : !!progress[step.id]
      })));
    };

    checkProgress();
    // Listen for storage events to update in real-time if multiple tabs
    window.addEventListener('storage', checkProgress);
    // Custom event for same-tab updates
    window.addEventListener('activation_updated', checkProgress);

    return () => {
      window.removeEventListener('storage', checkProgress);
      window.removeEventListener('activation_updated', checkProgress);
    };
  }, []);

  const nextStep = steps.find(s => !s.completed);
  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;

  if (completedCount === steps.length) return null; // Hide when done

  return (
    <Card className="mb-6 border-blue-500/20 bg-blue-500/5">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium text-blue-900 dark:text-blue-100">
            Getting Started
          </CardTitle>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {Math.round(progressPercent)}% Complete
          </span>
        </div>
        <div className="h-2 w-full bg-blue-200 dark:bg-blue-900 rounded-full mt-2">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center space-x-2">
                {step.completed ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs font-medium text-slate-500">
                    {idx + 1}
                  </div>
                )}
                <span className={`text-sm ${step.completed ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {nextStep && (
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => navigate(nextStep.path)}>
                Continue to {nextStep.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
