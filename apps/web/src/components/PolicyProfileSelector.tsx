import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

interface PolicyProfile {
  id: string;
  name: string;
  description: string;
  guardrails: {
    requirePurpose: boolean;
    requireJustification: boolean;
  };
}

interface PolicyProfileSelectorProps {
  tenantId: string;
  currentProfile?: string;
  onSuccess: () => void;
}

export function PolicyProfileSelector({ tenantId, currentProfile, onSuccess }: PolicyProfileSelectorProps) {
  const { token } = useAuth();
  const [profiles, setProfiles] = useState<PolicyProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>(currentProfile || 'baseline');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await fetch('/api/policy-profiles', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await res.json();
        if (json.success) {
          setProfiles(json.data);
        } else {
          setError(json.error || 'Failed to load profiles');
        }
      } catch (e) {
        setError('Network error loading profiles');
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, [token]);

  const handleApply = async () => {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/policy-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profileId: selectedProfile })
      });
      const json = await res.json();
      if (json.success) {
        onSuccess();
      } else {
        setError(json.error || 'Failed to apply policy');
      }
    } catch (e) {
      setError('Network error applying policy');
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <div>Loading profiles...</div>;
  if (error) return <div className="text-destructive">{error}</div>;

  return (
    <div className="space-y-6 py-4">
      <RadioGroup value={selectedProfile} onValueChange={setSelectedProfile} className="space-y-4">
        {profiles.map((profile) => (
          <div key={profile.id} className="flex items-start space-x-3 space-y-0">
            <RadioGroupItem value={profile.id} id={profile.id} className="mt-1" />
            <Label htmlFor={profile.id} className="flex-1 cursor-pointer">
              <Card className={`border-2 ${selectedProfile === profile.id ? 'border-primary' : 'border-transparent'}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{profile.name}</span>
                    {selectedProfile === profile.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{profile.description}</p>
                  <div className="flex gap-2">
                    {profile.guardrails.requirePurpose && (
                        <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">
                             <ShieldAlert className="h-3 w-3 mr-1" /> Purpose Required
                        </Badge>
                    )}
                    {profile.guardrails.requireJustification && (
                        <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">
                             <ShieldAlert className="h-3 w-3 mr-1" /> Justification Required
                        </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Label>
          </div>
        ))}
      </RadioGroup>

      <div className="flex justify-end gap-3 pt-4">
        <Button onClick={handleApply} disabled={applying || selectedProfile === currentProfile}>
          {applying ? 'Applying...' : 'Apply Profile'}
        </Button>
      </div>
    </div>
  );
}
