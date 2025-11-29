import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Shield, CreditCard, Globe } from 'lucide-react';

export default function TenantAdminPage() {
    const [plan, setPlan] = useState<any>(null);
    const [requests, setRequests] = useState<any[]>([]);
    const [selectedRegion, setSelectedRegion] = useState('us-east-1');
    const tenantId = 'TENANT_TEST'; // Mock

    useEffect(() => {
        // Fetch plan and requests
        // In real app, use SWR or React Query
        fetchPlan();
        fetchRequests();
    }, []);

    const fetchPlan = async () => {
         // Mock
         setPlan({ plan_id: 'starter', status: 'active' });
    };

    const fetchRequests = async () => {
         // Mock
         setRequests([]);
    };

    const handlePlanChange = async (newPlan: string) => {
        console.log('Changing plan to', newPlan);
        // Call API
        setPlan({ ...plan, plan_id: newPlan });
    };

    const handleResidencyRequest = async () => {
        console.log('Requesting residency in', selectedRegion);
        // Call API
        setRequests([{ id: '1', requestedRegion: selectedRegion, status: 'pending' }, ...requests]);
    };

    const handleDownloadInvoice = async () => {
        try {
            const res = await fetch('/api/tenant/invoice', {
                headers: { 'x-tenant-id': tenantId }
            });
            if (!res.ok) throw new Error('Failed to fetch invoice');

            const text = await res.text();
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert('Failed to download invoice');
        }
    };

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold">Tenant Administration</h1>

            {/* Plan Section */}
            <div className="border p-6 rounded-lg bg-white shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-semibold">Subscription Plan</h2>
                </div>
                <div className="space-y-4">
                    <p>Current Plan: <span className="font-mono font-bold uppercase">{plan?.plan_id}</span></p>
                    <div className="flex gap-4">
                        <Button
                            variant={plan?.plan_id === 'starter' ? 'default' : 'outline'}
                            onClick={() => handlePlanChange('starter')}
                        >
                            Starter
                        </Button>
                        <Button
                            variant={plan?.plan_id === 'pro' ? 'default' : 'outline'}
                            onClick={() => handlePlanChange('pro')}
                        >
                            Pro
                        </Button>
                         <Button
                            variant={plan?.plan_id === 'enterprise' ? 'default' : 'outline'}
                            onClick={() => handlePlanChange('enterprise')}
                        >
                            Enterprise
                        </Button>
                    </div>
                </div>
            </div>

            {/* Residency Section */}
            <div className="border p-6 rounded-lg bg-white shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5 text-green-600" />
                    <h2 className="text-xl font-semibold">Data Residency</h2>
                </div>
                 <div className="space-y-4">
                    <p className="text-sm text-gray-600">Request to move your data to a specific region for compliance.</p>
                    <div className="flex gap-4 items-center">
                        <select
                            className="border p-2 rounded"
                            value={selectedRegion}
                            onChange={(e) => setSelectedRegion(e.target.value)}
                        >
                            <option value="us-east-1">US East (N. Virginia)</option>
                            <option value="eu-central-1">EU (Frankfurt)</option>
                            <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                        </select>
                        <Button onClick={handleResidencyRequest}>Request Move</Button>
                    </div>

                    {requests.length > 0 && (
                        <div className="mt-4">
                            <h3 className="font-semibold text-sm mb-2">History</h3>
                            <ul className="space-y-2">
                                {requests.map((r, i) => (
                                    <li key={i} className="text-sm bg-gray-50 p-2 rounded flex justify-between">
                                        <span>Moved to {r.requestedRegion}</span>
                                        <span className="capitalize text-yellow-600">{r.status}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Quota Section */}
            <div className="border p-6 rounded-lg bg-white shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-purple-600" />
                    <h2 className="text-xl font-semibold">Quotas & Usage</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                     <div className="bg-gray-50 p-4 rounded text-center">
                        <div className="text-2xl font-bold">45%</div>
                        <div className="text-xs text-gray-500">API Calls</div>
                     </div>
                     <div className="bg-gray-50 p-4 rounded text-center">
                        <div className="text-2xl font-bold">12%</div>
                        <div className="text-xs text-gray-500">Storage</div>
                     </div>
                     <div className="bg-gray-50 p-4 rounded text-center">
                        <div className="text-2xl font-bold">89%</div>
                        <div className="text-xs text-gray-500">Egress</div>
                     </div>
                </div>
                 <div className="mt-4 text-right">
                    <Button variant="ghost" size="sm" onClick={handleDownloadInvoice}>Download Signed Invoice</Button>
                 </div>
            </div>
        </div>
    );
}
