import React from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="bg-muted p-4 rounded-full mb-6">
        <AlertTriangle className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-2">404</h1>
      <h2 className="text-xl font-semibold mb-4">Page Not Found</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Button onClick={() => navigate(-1)} variant="outline">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Go Back
      </Button>
    </div>
  );
};
