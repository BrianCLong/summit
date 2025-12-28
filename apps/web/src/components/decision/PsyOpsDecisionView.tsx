
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DecisionSupportPanel } from './DecisionSupportPanel';
import { DecisionContext } from '../../types/decision';
import { Spinner } from '../ui/Spinner';

// Mock API call - in reality, use axios/fetch or a custom hook
const fetchDecisionContext = async (threatId: string): Promise<DecisionContext> => {
  const response = await fetch(`/api/psyops/threats/${threatId}/decision-context`, {
      headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Simple auth for demo
      }
  });
  if (!response.ok) throw new Error('Failed to load context');
  return response.json();
};

const resolveThreat = async (threatId: string, optionId: string): Promise<void> => {
    const response = await fetch(`/api/psyops/threats/${threatId}/resolve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ notes: `Resolved via Decision Support: ${optionId}` })
    });
    if (!response.ok) throw new Error('Failed to resolve');
};

export const PsyOpsDecisionView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [context, setContext] = useState<DecisionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetchDecisionContext(id)
      .then(setContext)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleOptionSelect = async (optionId: string) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to proceed with: ${optionId}?`)) return;

    setActionLoading(true);
    try {
        await resolveThreat(id, optionId);
        alert('Action executed successfully.');
        navigate('/psyops/dashboard'); // Redirect back to list
    } catch (err: any) {
        alert(`Error: ${err.message}`);
    } finally {
        setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Spinner /></div>;
  if (error) return <div className="p-8 text-red-500">Error loading decision context: {error}</div>;
  if (!context) return <div className="p-8">No context found.</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Decision Support</h1>
            <p className="text-gray-600">Review the evidence and select an appropriate response.</p>
        </div>
        <DecisionSupportPanel
            context={context}
            onOptionSelect={handleOptionSelect}
            isLoading={actionLoading}
        />
    </div>
  );
};
