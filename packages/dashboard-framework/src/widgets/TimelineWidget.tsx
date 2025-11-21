import React, { useMemo } from 'react';
import { TimelineWidgetConfig } from '../types';

export interface TimelineWidgetProps {
  config: TimelineWidgetConfig;
  data?: any[];
  onEventClick?: (event: any) => void;
}

export function TimelineWidget({
  config,
  data = [],
  onEventClick,
}: TimelineWidgetProps) {
  const { startField, endField, labelField, groupField } = config;

  const events = useMemo(() => {
    return data.map(item => ({
      start: new Date(item[startField]),
      end: endField ? new Date(item[endField]) : undefined,
      label: item[labelField] || 'Event',
      group: groupField ? item[groupField] : undefined,
      original: item,
    })).sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [data, startField, endField, labelField, groupField]);

  const minDate = events.length > 0 ? events[0].start : new Date();
  const maxDate = events.length > 0 ? events[events.length - 1].start : new Date();
  const range = maxDate.getTime() - minDate.getTime() || 1;

  return (
    <div className="timeline-widget" style={containerStyle}>
      {events.length > 0 ? (
        <>
          {/* Timeline axis */}
          <div style={axisStyle}>
            <span>{minDate.toLocaleDateString()}</span>
            <span>{maxDate.toLocaleDateString()}</span>
          </div>

          {/* Timeline track */}
          <div style={trackStyle}>
            <div style={trackLineStyle} />
            {events.map((event, i) => {
              const position = ((event.start.getTime() - minDate.getTime()) / range) * 100;
              return (
                <div
                  key={i}
                  style={{
                    ...eventStyle,
                    left: `${position}%`,
                  }}
                  onClick={() => onEventClick?.(event.original)}
                  title={`${event.label} - ${event.start.toLocaleString()}`}
                >
                  <div style={eventDotStyle} />
                  <div style={eventLabelStyle}>{event.label}</div>
                </div>
              );
            })}
          </div>

          {/* Event list */}
          <div style={eventListStyle}>
            {events.slice(0, 10).map((event, i) => (
              <div
                key={i}
                style={eventItemStyle}
                onClick={() => onEventClick?.(event.original)}
              >
                <span style={{ color: '#3b82f6', fontWeight: 500 }}>
                  {event.start.toLocaleDateString()}
                </span>
                <span style={{ marginLeft: '12px' }}>{event.label}</span>
              </div>
            ))}
            {events.length > 10 && (
              <div style={{ ...eventItemStyle, color: '#9ca3af' }}>
                +{events.length - 10} more events
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={emptyStyle}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏰</div>
          <div>No timeline data</div>
        </div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
};

const axisStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '12px',
  color: '#6b7280',
  marginBottom: '8px',
};

const trackStyle: React.CSSProperties = {
  position: 'relative',
  height: '60px',
  marginBottom: '16px',
};

const trackLineStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: 0,
  right: 0,
  height: '2px',
  backgroundColor: '#e5e7eb',
  transform: 'translateY(-50%)',
};

const eventStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  cursor: 'pointer',
  textAlign: 'center',
};

const eventDotStyle: React.CSSProperties = {
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  backgroundColor: '#3b82f6',
  border: '2px solid white',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
  margin: '0 auto',
};

const eventLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#6b7280',
  whiteSpace: 'nowrap',
  marginTop: '4px',
  maxWidth: '60px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const eventListStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
};

const eventItemStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #f3f4f6',
  fontSize: '13px',
  cursor: 'pointer',
};

const emptyStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#9ca3af',
};
