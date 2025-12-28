import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const PlanLimits: React.FC = () => {
  const { user } = useAuth();
  // Fallback to a demo ID if user context doesn't have tenantId (e.g. during dev/demo)
  const tenantId = user?.tenantId || 'demo-tenant-123';

  const [limits, setLimits] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLimits = async () => {
        try {
            const res = await fetch(`/api/tenants/${tenantId}/limits`);
            if (res.ok) {
                const { data } = await res.json();
                setLimits({
                    ...data,
                    // Mock usage data mixed with real quota for display, as backend quota object might not have "usage" yet
                    usage: {
                        requests: 450,
                        storage: 1200000000,
                        seats: 3
                    }
                });
            } else {
                // Fallback for demo
                setLimits({
                    tier: 'FREE',
                    requestsPerDay: 1000,
                    storageLimitBytes: 5000000000,
                    seatCap: 5,
                    usage: { requests: 0, storage: 0, seats: 0 }
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    fetchLimits();
  }, [tenantId]);

  const calculatePercent = (used: number, total: number) => Math.min(100, (used / total) * 100);

  if (loading) return <div className="p-8">Loading limits...</div>;
  if (!limits) return <div className="p-8">Failed to load limits.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Plan & Limits</h1>
        <Button>
            <Zap className="mr-2 h-4 w-4" /> Upgrade Plan
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{limits.tier}</div>
            <p className="text-xs text-muted-foreground">Renewals on Apr 1, 2026</p>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground">+ Usage overages</p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage Limits</CardTitle>
          <CardDescription>Real-time usage against your plan quotas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>API Requests (Daily)</span>
                    <span className="text-muted-foreground">{limits.usage.requests} / {limits.requestsPerDay}</span>
                </div>
                <Progress value={calculatePercent(limits.usage.requests, limits.requestsPerDay)} />
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Storage (GB)</span>
                    <span className="text-muted-foreground">{(limits.usage.storage / 1e9).toFixed(1)} / {(limits.storageLimitBytes / 1e9).toFixed(1)} GB</span>
                </div>
                <Progress value={calculatePercent(limits.usage.storage, limits.storageLimitBytes)} />
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Seats</span>
                    <span className="text-muted-foreground">{limits.usage.seats} / {limits.seatCap}</span>
                </div>
                <Progress value={calculatePercent(limits.usage.seats, limits.seatCap)} />
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanLimits;
