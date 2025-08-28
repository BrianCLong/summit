import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationSystem from './NotificationSystem';

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';
  const isAction = location.pathname.startsWith('/actions/');
  
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