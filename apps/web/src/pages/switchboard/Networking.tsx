import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Lock, Globe, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Networking: React.FC = () => {
  const { user } = useAuth();
  const tenantId = user?.tenantId || 'demo-tenant-123';

  const [mode, setMode] = useState<'public' | 'restricted'>('public');
  const [saving, setSaving] = useState(false);

  const handleModeChange = async (newMode: 'public' | 'restricted') => {
      setMode(newMode);
      setSaving(true);
      try {
          await fetch(`/api/tenants/${tenantId}/networking`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mode: newMode })
          });
      } catch (e) {
          console.error("Failed to update networking mode", e);
      } finally {
          setSaving(false);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Networking & Isolation</h1>
        {saving && <Loader2 className="animate-spin text-gray-500" />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Network Access Mode</CardTitle>
          <CardDescription>Control how your tenant interacts with the public internet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
               <Globe className={`w-8 h-8 ${mode === 'public' ? 'text-green-500' : 'text-gray-400'}`} />
               <div>
                 <p className="font-medium">Public Access</p>
                 <p className="text-sm text-gray-500">Allow connections from any IP. Standard SaaS mode.</p>
               </div>
            </div>
            <Switch checked={mode === 'public'} onCheckedChange={() => handleModeChange('public')} />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-slate-800">
            <div className="flex items-center space-x-4">
               <Lock className={`w-8 h-8 ${mode === 'restricted' ? 'text-amber-500' : 'text-gray-400'}`} />
               <div>
                 <p className="font-medium">Restricted Mode</p>
                 <p className="text-sm text-gray-500">Block all egress except to allowlisted domains. Requires Private Link.</p>
               </div>
            </div>
            <Switch checked={mode === 'restricted'} onCheckedChange={() => handleModeChange('restricted')} />
          </div>

          {mode === 'restricted' && (
             <div className="p-4 bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                <p className="font-medium">Restricted Mode Active</p>
                <p className="text-sm mt-1">
                   External webhooks and exports will be blocked unless the destination is explicitly allowlisted.
                   Contact support to configure Private Link.
                </p>
                <Button variant="outline" size="sm" className="mt-2 border-amber-300 text-amber-900 hover:bg-amber-100">
                   Request Private Link
                </Button>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Networking;
