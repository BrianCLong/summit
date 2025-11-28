import React, { useState } from 'react';
import { CompanyProfile } from './types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Loader2 } from 'lucide-react';

interface GrowthPlaybookGeneratorProps {
  onGenerate: (profile: CompanyProfile) => void;
  isLoading: boolean;
}

export function GrowthPlaybookGenerator({ onGenerate, isLoading }: GrowthPlaybookGeneratorProps) {
  const [profile, setProfile] = useState<CompanyProfile>({
    name: '',
    industry: '',
    stage: 'growth',
    employees: 0,
    revenue: 0,
    challenges: [],
    goals: []
  });

  const [challengesInput, setChallengesInput] = useState('');
  const [goalsInput, setGoalsInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      ...profile,
      challenges: challengesInput.split(',').map(s => s.trim()).filter(Boolean),
      goals: goalsInput.split(',').map(s => s.trim()).filter(Boolean)
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Summit Growth Playbook Generator</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={e => setProfile({...profile, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={profile.industry}
                onChange={e => setProfile({...profile, industry: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employees">Employees</Label>
              <Input
                id="employees"
                type="number"
                value={profile.employees}
                onChange={e => setProfile({...profile, employees: parseInt(e.target.value)})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenue">Revenue (Annual)</Label>
              <Input
                id="revenue"
                type="number"
                value={profile.revenue}
                onChange={e => setProfile({...profile, revenue: parseInt(e.target.value)})}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage">Stage</Label>
            <Select
              value={profile.stage}
              onValueChange={(val: any) => setProfile({...profile, stage: val})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="startup">Startup</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="scaleup">Scale-up</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="challenges">Key Challenges (comma separated)</Label>
            <Textarea
              id="challenges"
              value={challengesInput}
              onChange={e => setChallengesInput(e.target.value)}
              placeholder="e.g., Hiring velocity, Customer churn, Tech debt"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goals">Strategic Goals (comma separated)</Label>
            <Textarea
              id="goals"
              value={goalsInput}
              onChange={e => setGoalsInput(e.target.value)}
              placeholder="e.g., 3x revenue in 3 years, Expand to EU, IPO readiness"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Playbook...
              </>
            ) : (
              'Generate Playbook'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
