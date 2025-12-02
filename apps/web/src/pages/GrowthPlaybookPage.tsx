import React, { useState } from 'react';
import { GrowthPlaybookGenerator } from '@/features/growth/GrowthPlaybookGenerator';
import { GrowthPlaybookView } from '@/features/growth/GrowthPlaybookView';
import { CompanyProfile, Playbook } from '@/features/growth/types';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';

export default function GrowthPlaybookPage() {
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (profile: CompanyProfile) => {
    setIsLoading(true);
    try {
      // Use relative path for proxying or full URL if CORS allowed
      const response = await fetch('/api/growth/playbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        throw new Error('Failed to generate playbook');
      }

      const data = await response.json();
      setPlaybook(data.data);
      toast({
        title: "Success",
        description: "Your personalized growth playbook is ready.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate playbook. Please try again.",
        variant: "destructive"
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <PageHeader
        title="AI Growth Playbook"
        description="Generate a customized execution roadmap for your business using our AI engine."
      />

      {!playbook ? (
        <GrowthPlaybookGenerator onGenerate={handleGenerate} isLoading={isLoading} />
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setPlaybook(null)}
            className="text-sm text-muted-foreground hover:text-primary mb-4"
          >
            ← Generate another playbook
          </button>
          <GrowthPlaybookView playbook={playbook} />
        </div>
      )}
    </div>
  );
}
