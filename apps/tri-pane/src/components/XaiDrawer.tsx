import React, { useEffect, useRef, useState } from 'react';
import $ from 'jquery';

interface XaiDrawerProps {
  isOpen: boolean;
  anomalyId: string;
  onClose: () => void;
}

export const XaiDrawer: React.FC<XaiDrawerProps> = ({ isOpen, anomalyId, onClose }) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Wait for render, then animate in
      setTimeout(() => {
          if (drawerRef.current) {
            $(drawerRef.current).css('right', '-300px').animate({ right: '0px' }, 300);
          }
      }, 0);
    } else {
      // Animate out, then unmount
      if (drawerRef.current) {
        $(drawerRef.current).animate({ right: '-300px' }, 300, () => {
            setShouldRender(false);
        });
      }
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <div
      ref={drawerRef}
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        right: isOpen ? 0 : '-300px', // Initial state for animate
        width: '300px',
        background: 'white',
        boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Anomaly Explanation</h2>
        <button onClick={onClose}>Close</button>
      </div>
      <div>
        <p>Analyzing Anomaly ID: {anomalyId}</p>
        <div id="xai-content">
           Loading explanation...
        </div>
      </div>
    </div>
  );
};
