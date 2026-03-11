import React from 'react';
import { TrendingUp, CheckCircle2 } from 'lucide-react';

export const OutcomeTracker = ({ outcomes }: { outcomes: any }) => {
  if (!outcomes) return <div style={{ color: '#6e6e6e' }}>Waiting for learning outcomes...</div>;

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ color: '#a6adc8' }}>Prediction Accuracy</span>
        <span style={{ color: '#a6e3a1', fontWeight: 'bold' }}>{(outcomes.accuracy_score * 100).toFixed(1)}%</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ color: '#a6adc8' }}>Fitness Delta</span>
        <span style={{ color: '#89b4fa', fontWeight: 'bold' }}>+{outcomes.fitness_delta * 100}%</span>
      </div>
      
      <div style={{ marginTop: '16px' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#cba6f7' }}>Learned Patterns</h4>
        {outcomes.learned_patterns?.map((p: any) => (
          <div key={p.id} style={{ fontSize: '0.8rem', padding: '8px', background: '#313244', borderRadius: '4px', marginBottom: '4px' }}>
            <div style={{ color: '#cdd6f4' }}>{p.description}</div>
            <div style={{ color: '#94e2d5', fontSize: '0.7rem' }}>Confidence: {p.confidence * 100}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};
