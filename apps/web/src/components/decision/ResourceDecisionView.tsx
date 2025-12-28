
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DecisionSupportPanel } from './DecisionSupportPanel';
import { DecisionContext } from '../../types/decision';
import { Spinner } from '../ui/Spinner';

const fetchResourceContext = async (requestId: string): Promise<DecisionContext> => {
    const response = await fetch(`/api/resources/requests/${requestId}/decision-context`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
    if (!response.ok) throw new Error('Failed to load decision context');
    return response.json();
};

const submitDecision = async (requestId: string, optionId: string): Promise<void> => {
    const response = await fetch(`/api/resources/requests/${requestId}/decide`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ optionId })
    });
    if (!response.ok) throw new Error('Failed to submit decision');
};

export const ResourceDecisionView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [context, setContext] = useState<DecisionContext | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        fetchResourceContext(id)
            .then(setContext)
            .finally(() => setLoading(false));
    }, [id]);

    const handleOptionSelect = async (optionId: string) => {
        if (!window.confirm(`Confirm decision: ${optionId}?`)) return;

        try {
            await submitDecision(id!, optionId);
            alert('Decision recorded successfully.');
            navigate('/resources');
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Spinner /></div>;
    if (!context) return <div className="p-8">No context found.</div>;

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Resource Approval</h1>
                <p className="text-gray-600">Authorize infrastructure scaling requests.</p>
            </div>
            <DecisionSupportPanel
                context={context}
                onOptionSelect={handleOptionSelect}
            />
        </div>
    );
};
