import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationSystem from './NotificationSystem';
import { getSocket } from '../services/socket';

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [alertCount, setAlertCount] = useState(0);

  const isHome = location.pathname === '/';
  const isAction = location.pathname.startsWith('/actions/');
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const handler = (_evt:any) => setAlertCount((c)=>c+1);
    s.on('ALERT_EVT', handler);
    const uiHandler = () => setAlertCount((c)=>c+1);
    window.addEventListener('ig:ALERT_EVT', uiHandler as any);
    return () => { try { s.off('ALERT_EVT', handler); } catch {}; window.removeEventListener('ig:ALERT_EVT', uiHandler as any); };
  }, []);
  
  return (
    <nav style={{ 
      backgroundColor: '#fff', 
      borderBottom: '1px solid var(--hairline)', 
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div style={{ 
        fontSize: '1.2rem', 
        fontWeight: '600', 
        color: '#1a73e8',
        cursor: 'pointer'
      }} onClick={() => navigate('/')}>
        IntelGraph
      </div>
      
      <div style={{ flex: 1 }}></div>
      
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <NotificationSystem position="top-right" maxNotifications={5} />
        <button
          title="Watchlists & Alerts"
          onClick={() => { setAlertCount(0); navigate('/osint/watchlists'); }}
          style={{ position:'relative', padding: '6px 10px', border: '1px solid var(--hairline)', borderRadius: 6, background: '#f6f7f9', cursor: 'pointer' }}
        >
          🔔 Alerts
          {alertCount > 0 && (
            <span style={{ position:'absolute', top:-6, right:-6, background:'#e11d48', color:'#fff', borderRadius:12, fontSize:12, padding:'2px 6px' }}>{alertCount}</span>
          )}
        </button>
        <button
          title="Watchlists"
          onClick={() => navigate('/osint/watchlists')}
          style={{ padding: '6px 10px', border: '1px solid var(--hairline)', borderRadius: 6, background: '#f6f7f9', cursor: 'pointer' }}
        >
          📋 Watchlists
        </button>
        <button
          title="OSINT Studio"
          onClick={() => navigate('/osint')}
          style={{ padding: '6px 10px', border: '1px solid var(--hairline)', borderRadius: 6, background: '#f6f7f9', cursor: 'pointer' }}
        >
          🛰️ OSINT
        </button>
        <button
          title="OSINT Studio"
          onClick={() => navigate('/osint')}
          style={{ padding: '6px 10px', border: '1px solid var(--hairline)', borderRadius: 6, background: '#f6f7f9', cursor: 'pointer' }}
        >
          🛰️ OSINT
        </button>
        
        {!isHome && (
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1px solid var(--hairline)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#666'
            }}
          >
            ← Home
          </button>
        )}
        
        {isAction && (
          <div style={{ 
            fontSize: '14px', 
            color: '#666',
            padding: '6px 12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px'
          }}>
            Action: {location.pathname.split('/')[2]}
          </div>
        )}
        
        <div style={{ 
          fontSize: '12px', 
          color: '#999',
          padding: '4px'
        }}>
          {location.pathname}
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
