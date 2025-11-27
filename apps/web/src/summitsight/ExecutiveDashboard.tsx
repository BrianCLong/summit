import React, { useEffect, useState } from 'react';
import { KPIStatus } from './types';
import { KPIView } from './KPIView';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth'; // Assuming auth hook exists

export const ExecutiveDashboard: React.FC = () => {
    const { user } = useAuth();
    const [role, setRole] = useState<'CEO' | 'CTO' | 'CISO'>('CEO');
    const [metrics, setMetrics] = useState<KPIStatus[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchDashboard(role);
    }, [role]);

    const fetchDashboard = async (selectedRole: string) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token'); // Or however auth is handled
            const res = await fetch(`/summitsight/exec-dashboard/${selectedRole}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.metrics) {
                setMetrics(data.metrics);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Summitsight Executive Intelligence</h1>
                <div className="text-sm text-gray-500">
                    Viewing as: <span className="font-mono font-bold text-gray-800">{user?.email || 'Guest'}</span>
                </div>
            </div>

            <Tabs defaultValue="CEO" onValueChange={(val) => setRole(val as any)} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="CEO">CEO</TabsTrigger>
                    <TabsTrigger value="CTO">CTO</TabsTrigger>
                    <TabsTrigger value="CISO">CISO</TabsTrigger>
                </TabsList>

                <TabsContent value={role} className="mt-6">
                    {loading ? (
                        <div className="flex justify-center p-12">Loading intelligence...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {metrics.map((m) => (
                                <KPIView key={m.definition.kpi_id} data={m} />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};
