import React, { useState, useEffect } from 'react';
import { Shield, Activity, Map, Lightbulb, TrendingUp, Play, GraduationCap } from 'lucide-react';
import { OutcomeTracker } from './components/OutcomeTracker';

const Card = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
  <div style={{ background: '#1e1e2e', borderRadius: '12px', padding: '24px', border: '1px solid #313244', marginBottom: '20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
      <Icon style={{ marginRight: '12px', color: '#cba6f7' }} />
      <h3 style={{ margin: 0, color: '#cdd6f4' }}>{title}</h3>
    </div>
    {children}
  </div>
);

export default function App() {
  const [data, setData] = useState<any>({ stability: null, topology: null, innovations: null, strategy: null, learning: null, health: null });
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stability, topology, innovations, strategy, learning, health] = await Promise.all([
          fetch('http://localhost:4050/api/intel/stability').then(res => res.json()),
          fetch('http://localhost:4050/api/intel/topology').then(res => res.json()),
          fetch('http://localhost:4050/api/intel/innovations').then(res => res.json()),
          fetch('http://localhost:4050/api/intel/strategy').then(res => res.json()),
          fetch('http://localhost:4050/api/intel/learning').then(res => res.json()),
          fetch('http://localhost:4050/api/system-health').then(res => res.json())
        ]);
        setData({ stability, topology, innovations, strategy, learning, health });
      } catch (e) { console.error('Error fetching intel:', e); }
    };
    fetchData();
  }, []);

  const runSim = async () => {
    const res = await fetch('http://localhost:4050/api/intel/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ change: 'Upgrade to Concurrent Graph Engine' })
    });
    setSimResult(await res.json());
  };

  return (
    <div style={{ background: '#11111b', color: '#cdd6f4', minHeight: '100vh', padding: '40px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold', background: 'linear-gradient(90deg, #cba6f7, #89b4fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Summit Intelligence Console
        </h1>
        <p style={{ color: '#a6adc8' }}>Autonomous Architecture Awareness & Simulation Lab</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <Card title="Architecture Stability" icon={Shield}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#a6e3a1' }}>{data.stability?.score || '--'}%</div>
          <p style={{ color: '#a6adc8', fontSize: '0.9rem' }}>Overall Structural Integrity Score</p>
          <div style={{ marginTop: '16px' }}>
            {data.stability?.hotspots?.map((h: any) => (
              <div key={h.component} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #313244' }}>
                <span>{h.component}</span>
                <span style={{ color: h.risk === 'high' ? '#f38ba8' : '#a6e3a1' }}>{h.risk.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Topology State" icon={Map}>
          <div style={{ height: '200px', background: '#181825', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {data.topology ? `Active Nodes: ${data.topology.nodes?.length}` : 'Loading topology...'}
          </div>
        </Card>

        <Card title="Innovation Pipeline" icon={Lightbulb}>
          {data.innovations?.innovations?.map((i: any) => (
            <div key={i.id} style={{ padding: '12px', background: '#313244', borderRadius: '8px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>{i.title}</div>
              <div style={{ fontSize: '0.8rem', color: '#fab387' }}>{i.status.toUpperCase()}</div>
            </div>
          ))}
        </Card>

        <Card title="Architecture Learning" icon={GraduationCap}>
          <OutcomeTracker outcomes={data.learning} />
        </Card>

        <Card title="System Consciousness Health" icon={Activity}>
          {data.health && data.health.overallStatus ? (
             <div>
               <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#cba6f7' }}>{data.health.overallStatus?.toUpperCase()}</div>
               <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                  <div style={{ background: '#313244', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ color: '#89b4fa' }}>Integrity</div>
                    <div style={{ fontSize: '1rem' }}>{data.health.consciousnessIntegrity}%</div>
                  </div>
                  <div style={{ background: '#313244', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ color: '#a6e3a1' }}>Security</div>
                    <div style={{ fontSize: '1rem' }}>{data.health.securityPosture}%</div>
                  </div>
               </div>
               <div style={{ marginTop: '12px', fontSize: '0.9rem', color: '#fab387' }}>
                 Quantum Readiness: {data.health.quantumReadiness}%
               </div>
             </div>
          ) : (
            <div style={{ color: '#f38ba8' }}>Awaiting Consciousness Sync...</div>
          )}
        </Card>

        <Card title="Simulation Lab" icon={Play}>
          <button 
            onClick={runSim}
            style={{ width: '100%', padding: '12px', background: '#cba6f7', color: '#11111b', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '16px' }}
          >
            Run Architectural Simulation
          </button>
          {simResult && (
            <div style={{ padding: '16px', background: '#a6e3a1', color: '#11111b', borderRadius: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>Simulation Result: SUCCESS</div>
              <div style={{ fontSize: '0.9rem' }}>{simResult.recommendation}</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
