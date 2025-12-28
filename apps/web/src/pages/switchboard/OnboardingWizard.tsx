import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const OnboardingWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth(); // Attempt to get auth context, though strictly onboarding might be pre-auth

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    residency: 'US', // Default
    region: 'us-east-1',
    oidcIssuer: '',
    oidcClientId: '',
    scimEnabled: false,
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleProvision = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Create Tenant
      const createRes = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ...` handled by cookie/browser usually or intercepted
        },
        body: JSON.stringify({
            name: formData.name,
            slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
            residency: formData.residency,
            region: formData.region
        })
      });

      if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || 'Failed to create tenant');
      }

      const { data: tenant } = await createRes.json();

      // 2. Configure Identity (if provided)
      if (formData.oidcIssuer) {
          const identityRes = await fetch(`/api/tenants/${tenant.id}/identity`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  oidc: {
                      issuer: formData.oidcIssuer,
                      clientId: formData.oidcClientId,
                      clientSecret: 'placeholder-secret', // In real flow, this might be a separate secure input
                      redirectUris: []
                  },
                  scim: { enabled: formData.scimEnabled }
              })
          });
          if (!identityRes.ok) console.warn("Identity config failed", await identityRes.json());
      }

      setSuccess(true);
    } catch (e: any) {
        setError(e.message);
    } finally {
        setLoading(false);
    }
  };

  if (success) {
      return (
          <div className="max-w-md mx-auto mt-10 text-center space-y-4">
              <div className="flex justify-center">
                  <div className="rounded-full bg-green-100 p-3">
                      <Check className="h-8 w-8 text-green-600" />
                  </div>
              </div>
              <h2 className="text-2xl font-bold">Tenant Provisioned!</h2>
              <p className="text-gray-500">Your new environment is ready.</p>
              <Button onClick={() => window.location.href = '/switchboard/plans'}>Manage Tenant</Button>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Tenant Onboarding</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span className={step >= 1 ? 'text-blue-600 font-medium' : ''}>1. Basics</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step >= 2 ? 'text-blue-600 font-medium' : ''}>2. Identity</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step >= 3 ? 'text-blue-600 font-medium' : ''}>3. Review</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && 'Tenant Basics'}
            {step === 2 && 'Identity Configuration'}
            {step === 3 && 'Review & Provision'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Configure the fundamental settings for the new tenant.'}
            {step === 2 && 'Set up OIDC and SCIM for automated user provisioning.'}
            {step === 3 && 'Verify settings and launch the tenant.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                  {error}
              </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tenant Name</Label>
                <Input
                  id="name"
                  placeholder="Acme Corp"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL Identifier)</Label>
                <Input
                  id="slug"
                  placeholder="acme-corp"
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  onChange={e => setFormData({ ...formData, region: e.target.value, residency: e.target.value.startsWith('eu') ? 'EU' : 'US' })}
                  value={formData.region}
                >
                  <option value="" disabled>Select a region</option>
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="eu-central-1">EU (Frankfurt)</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="oidcIssuer">OIDC Issuer URL</Label>
                <Input
                  id="oidcIssuer"
                  placeholder="https://auth.example.com"
                  value={formData.oidcIssuer}
                  onChange={e => setFormData({ ...formData, oidcIssuer: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oidcClientId">Client ID</Label>
                <Input
                  id="oidcClientId"
                  value={formData.oidcClientId}
                  onChange={e => setFormData({ ...formData, oidcClientId: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="scim"
                  className="rounded border-gray-300"
                  checked={formData.scimEnabled}
                  onChange={e => setFormData({ ...formData, scimEnabled: e.target.checked })}
                />
                <Label htmlFor="scim">Enable SCIM Provisioning</Label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-md bg-gray-50 p-4 space-y-2 dark:bg-slate-800">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name:</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Region:</span>
                  <span className="font-medium">{formData.region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">OIDC Issuer:</span>
                  <span className="font-medium">{formData.oidcIssuer || 'Not configured'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">SCIM:</span>
                  <span className="font-medium">{formData.scimEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
              <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm dark:bg-blue-900/30 dark:text-blue-200">
                Provisioning will create the tenant resources and generate initial API keys.
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={prevStep} disabled={step === 1 || loading}>
              Back
            </Button>
            {step < 3 ? (
              <Button onClick={nextStep}>Next <ChevronRight className="ml-2 w-4 h-4" /></Button>
            ) : (
              <Button onClick={handleProvision} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Provision Tenant
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingWizard;
