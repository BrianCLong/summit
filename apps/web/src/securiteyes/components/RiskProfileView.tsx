import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

interface RiskProfile {
    principalId: string;
    riskScore: number;
    riskFactors: Record<string, string>;
}

export const RiskProfileView: React.FC = () => {
    const [profiles, setProfiles] = useState<RiskProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/securiteyes/risk/high', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        })
        .then(res => res.json())
        .then(data => {
            setProfiles(data || []);
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    if (loading) return <div>Loading Risk Profiles...</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Insider Risk Profiles (High Risk)</CardTitle>
            </CardHeader>
            <CardContent>
                {profiles.length === 0 ? (
                    <div className="text-muted-foreground">No high risk profiles detected.</div>
                ) : (
                    <div className="space-y-4">
                        {profiles.map((profile) => (
                             <div key={profile.principalId} className="p-4 border rounded bg-red-50 dark:bg-red-950/20">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="font-bold">Principal: {profile.principalId}</div>
                                    <Badge variant="destructive">Score: {profile.riskScore}</Badge>
                                </div>

                                <div className="text-sm text-muted-foreground">
                                    <div className="font-semibold mb-1">Recent Factors:</div>
                                    <ul className="list-disc pl-5">
                                        {Object.entries(profile.riskFactors).slice(-3).map(([ts, reason]) => (
                                            <li key={ts}>
                                                <span className="text-xs opacity-70">{new Date(ts).toLocaleString()}:</span> {reason}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                             </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
